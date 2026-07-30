import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { CANVAS, photos as photoData } from '../data/photos';
import {
  FACTORY_DEFAULTS,
  clearSavedDefaults,
  loadSavedDefaults,
  saveAsDefault,
} from '../gallery/settings';
import { buildFocusLayouts, clamp, computeFocusRect } from '../gallery/layout';
import GalleryControls from './GalleryControls';
import './PhotoGallery.css';

gsap.registerPlugin(Flip);

const contentBounds = photoData.reduce(
  (bounds, photo) => ({
    minX: Math.min(bounds.minX, photo.x),
    minY: Math.min(bounds.minY, photo.y),
    maxX: Math.max(bounds.maxX, photo.x + photo.w),
    maxY: Math.max(bounds.maxY, photo.y + photo.h),
  }),
  { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
);

function PhotoGallery() {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const layoutsRef = useRef(
    Object.fromEntries(photoData.map((photo) => [photo.id, { ...photo }])),
  );
  const homeRef = useRef(
    Object.fromEntries(photoData.map((photo) => [photo.id, { ...photo }])),
  );
  const flipBusyRef = useRef(false);
  const focusedIdRef = useRef(null);
  const settingsRef = useRef(loadSavedDefaults());
  const flipStaggerRef = useRef(null);

  const [settings, setSettings] = useState(() => loadSavedDefaults());
  const [controlsOpen, setControlsOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.45 });
  const [layouts, setLayouts] = useState(() =>
    Object.fromEntries(photoData.map((photo) => [photo.id, { ...photo }])),
  );
  const [focusedId, setFocusedId] = useState(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const movedRef = useRef(false);
  const pressTargetRef = useRef(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const appearanceStyle = useMemo(
    () => ({
      '--photo-radius': `${settings.borderRadius}px`,
      '--photo-hover-scale': settings.hoverScale,
      '--focus-shadow': `0 ${settings.focusShadowY}px ${settings.focusShadowBlur}px rgba(20, 20, 20, ${settings.focusShadowOpacity})`,
    }),
    [settings],
  );

  const applyCamera = useCallback((next) => {
    const viewport = viewportRef.current;
    const cfg = settingsRef.current;
    if (!viewport) {
      cameraRef.current = next;
      setCamera(next);
      return;
    }

    const { width, height } = viewport.getBoundingClientRect();
    const scale = clamp(next.scale, cfg.minScale, cfg.maxScale);
    const pad = cfg.panBoundsPad;
    const minX = width - CANVAS.width * scale - width * pad;
    const maxX = width * pad;
    const minY = height - CANVAS.height * scale - height * pad;
    const maxY = height * pad;

    const clamped = {
      x: clamp(next.x, minX, maxX),
      y: clamp(next.y, minY, maxY),
      scale,
    };

    cameraRef.current = clamped;
    setCamera(clamped);
  }, []);

  const getOverviewCamera = useCallback(() => {
    const viewport = viewportRef.current;
    const cfg = settingsRef.current;
    if (!viewport) return cameraRef.current;

    const { width, height } = viewport.getBoundingClientRect();
    const contentW = contentBounds.maxX - contentBounds.minX + cfg.overviewGap * 2;
    const contentH = contentBounds.maxY - contentBounds.minY + cfg.overviewGap * 2;
    const scale = Math.min(
      (width * cfg.overviewFitX) / contentW,
      (height * cfg.overviewFitY) / contentH,
    );
    const centerX = (contentBounds.minX + contentBounds.maxX) / 2;
    const centerY = (contentBounds.minY + contentBounds.maxY) / 2;
    return {
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale,
      scale,
    };
  }, []);

  const fitOverview = useCallback(() => {
    applyCamera(getOverviewCamera());
  }, [applyCamera, getOverviewCamera]);

  const zoomAt = useCallback(
    (clientX, clientY, factor) => {
      const viewport = viewportRef.current;
      const cfg = settingsRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const { x, y, scale } = cameraRef.current;
      const nextScale = clamp(scale * factor, cfg.minScale, cfg.maxScale);
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const worldX = (px - x) / scale;
      const worldY = (py - y) / scale;

      applyCamera({
        x: px - worldX * nextScale,
        y: py - worldY * nextScale,
        scale: nextScale,
      });
    },
    [applyCamera],
  );

  const applyLayouts = useCallback((nextLayouts) => {
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
  }, []);

  const runFlip = useCallback((mutate) => {
    if (flipBusyRef.current || !canvasRef.current) return;
    flipBusyRef.current = true;

    const nodes = canvasRef.current.querySelectorAll('.gallery-photo');
    const state = Flip.getState(nodes);
    const cfg = settingsRef.current;

    flushSync(() => {
      mutate();
    });

    const staggerFn = flipStaggerRef.current;

    Flip.from(state, {
      absolute: true,
      duration: cfg.flipDuration,
      ease: cfg.flipEase,
      stagger: staggerFn
        ? (index, target) => staggerFn(index, target)
        : { amount: cfg.flipStagger, from: 'center' },
      nested: true,
      onComplete: () => {
        flipBusyRef.current = false;
        flipStaggerRef.current = null;
      },
    });
  }, []);

  const focusPhoto = useCallback(
    (photoId) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const home = homeRef.current[photoId];
      if (!home) return;

      const cfg = settingsRef.current;
      const size = viewport.getBoundingClientRect();
      const focusRect = computeFocusRect(home, size, cameraRef.current, cfg);
      const focusCx = focusRect.x + focusRect.w / 2;
      const focusCy = focusRect.y + focusRect.h / 2;

      runFlip(() => {
        const next = buildFocusLayouts(
          photoId,
          focusRect,
          homeRef.current,
          layoutsRef.current,
          cfg,
        );

        if (cfg.staggerByDistance) {
          let maxDist = 1;
          const distances = {};
          for (const id of Object.keys(next)) {
            const layout = next[id];
            const dist = Math.hypot(
              layout.x + layout.w / 2 - focusCx,
              layout.y + layout.h / 2 - focusCy,
            );
            distances[id] = dist;
            maxDist = Math.max(maxDist, dist);
          }

          flipStaggerRef.current = (_index, target) => {
            const id = target.getAttribute('data-photo-id');
            return ((distances[id] ?? 0) / maxDist) * cfg.flipStagger;
          };
        } else {
          flipStaggerRef.current = null;
        }

        focusedIdRef.current = photoId;
        setFocusedId(photoId);
        applyLayouts(next);
      });
    },
    [applyLayouts, runFlip],
  );

  const goOverview = useCallback(() => {
    flipStaggerRef.current = null;
    runFlip(() => {
      const next = Object.fromEntries(
        photoData.map((photo) => [photo.id, { ...homeRef.current[photo.id] }]),
      );
      focusedIdRef.current = null;
      setFocusedId(null);
      applyLayouts(next);
    });
    applyCamera(getOverviewCamera());
  }, [applyCamera, applyLayouts, getOverviewCamera, runFlip]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      settingsRef.current = next;
      return next;
    });
    setSavedNotice('');
  }, []);

  const handleSetDefault = useCallback(() => {
    saveAsDefault(settingsRef.current);
    setSavedNotice('Saved as default');
  }, []);

  const handleResetSaved = useCallback(() => {
    const saved = loadSavedDefaults();
    settingsRef.current = saved;
    setSettings(saved);
    setSavedNotice('Loaded default');
    if (!focusedIdRef.current) fitOverview();
  }, [fitOverview]);

  const handleResetFactory = useCallback(() => {
    clearSavedDefaults();
    settingsRef.current = { ...FACTORY_DEFAULTS };
    setSettings({ ...FACTORY_DEFAULTS });
    setSavedNotice('Factory reset');
    if (!focusedIdRef.current) fitOverview();
  }, [fitOverview]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitOverview());
    const onResize = () => {
      if (!focusedIdRef.current) fitOverview();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [fitOverview]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      event.preventDefault();
      setHintVisible(false);
      const cfg = settingsRef.current;
      const factor = event.deltaY > 0 ? cfg.wheelZoomOut : cfg.wheelZoomIn;
      zoomAt(event.clientX, event.clientY, factor);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') goOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOverview]);

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (flipBusyRef.current) return;
    if (event.target.closest?.('.gc')) return;

    setHintVisible(false);
    movedRef.current = false;

    const photoEl = event.target.closest?.('[data-photo-id]');
    pressTargetRef.current = photoEl?.getAttribute('data-photo-id') ?? null;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    viewportRef.current?.setPointerCapture?.(event.pointerId);

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: cameraRef.current.x,
        originY: cameraRef.current.y,
      };
      setIsDragging(true);
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      pressTargetRef.current = null;
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        distance: Math.hypot(dx, dy) || 1,
        scale: cameraRef.current.scale,
      };
    }
  };

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const distance = Math.hypot(dx, dy) || 1;
      const factor = distance / pinchRef.current.distance;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      movedRef.current = true;
      pressTargetRef.current = null;
      zoomAt(midX, midY, (pinchRef.current.scale * factor) / cameraRef.current.scale);
      return;
    }

    if (!dragRef.current) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > settingsRef.current.dragThreshold) {
      movedRef.current = true;
      pressTargetRef.current = null;
    }

    if (!movedRef.current) return;

    applyCamera({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
      scale: cameraRef.current.scale,
    });
  };

  const endPointer = (event) => {
    const photoId = pressTargetRef.current;
    const wasTap = !movedRef.current && pointersRef.current.size === 1;

    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    if (pointersRef.current.size === 1) {
      const remaining = [...pointersRef.current.entries()][0];
      dragRef.current = {
        startX: remaining[1].x,
        startY: remaining[1].y,
        originX: cameraRef.current.x,
        originY: cameraRef.current.y,
      };
    }

    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setIsDragging(false);
      pressTargetRef.current = null;

      if (wasTap && photoId && !flipBusyRef.current) {
        if (focusedIdRef.current === photoId) {
          goOverview();
        } else {
          focusPhoto(photoId);
        }
      }
    }
  };

  return (
    <div className="gallery" style={appearanceStyle}>
      <header className="gallery-chrome">
        <a className="gallery-brand" href="/">
          AGCK
        </a>
        <p className="gallery-label">Photography</p>
        <button type="button" className="gallery-reset" onClick={goOverview}>
          Overview
        </button>
      </header>

      <div
        ref={viewportRef}
        className={`gallery-viewport ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          ref={canvasRef}
          className="gallery-canvas"
          style={{
            width: CANVAS.width,
            height: CANVAS.height,
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
          }}
        >
          {photoData.map((photo) => {
            const layout = layouts[photo.id] ?? photo;
            return (
              <button
                key={photo.id}
                type="button"
                data-photo-id={photo.id}
                className={`gallery-photo ${focusedId === photo.id ? 'is-focused' : ''}`}
                style={{
                  left: layout.x,
                  top: layout.y,
                  width: layout.w,
                  height: layout.h,
                  zIndex: focusedId === photo.id ? 5 : 1,
                }}
                aria-label={photo.alt}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>

        {hintVisible && settings.showHint && (
          <div className="gallery-hint" aria-hidden="true">
            <span>Drag to explore</span>
            <span className="gallery-hint-dot" />
            <span>Scroll to zoom</span>
            <span className="gallery-hint-dot" />
            <span>Click a photo</span>
          </div>
        )}
      </div>

      <GalleryControls
        open={controlsOpen}
        onToggle={() => setControlsOpen((open) => !open)}
        settings={settings}
        onChange={updateSetting}
        onSetDefault={handleSetDefault}
        onResetSaved={handleResetSaved}
        onResetFactory={handleResetFactory}
        savedNotice={savedNotice}
      />
    </div>
  );
}

export default PhotoGallery;
