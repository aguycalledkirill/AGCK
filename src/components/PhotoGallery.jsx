import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import {
  clearSavedDefaults,
  getDeviceDefaults,
  hasSeenHint,
  isDebugControlsEnabled,
  isMobileViewport,
  loadSavedDefaults,
  markHintSeen,
  prefersReducedMotion,
  saveAsDefault,
} from '../gallery/settings';
import { buildTopAlignedHome } from '../gallery/homeLayout';
import {
  buildFocusLayouts,
  clamp,
  computeCanonicalFocus,
} from '../gallery/layout';
import Footer from './Footer';
import GalleryControls from './GalleryControls';
import Header from './Header';
import './PhotoGallery.css';

gsap.registerPlugin(Flip);
gsap.ticker.fps(60);
gsap.ticker.lagSmoothing(500, 33);

const GRID_KEYS = new Set([
  'gridColumns',
  'gridGap',
  'gridPad',
  'columnWidth',
  'showCaptions',
  'layoutScatter',
]);

function boundsFromHome(byId) {
  return Object.values(byId).reduce(
    (bounds, photo) => ({
      minX: Math.min(bounds.minX, photo.x),
      minY: Math.min(bounds.minY, photo.y),
      maxX: Math.max(bounds.maxX, photo.x + photo.w),
      maxY: Math.max(bounds.maxY, photo.y + photo.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function motionConfig(cfg) {
  if (prefersReducedMotion()) {
    return {
      ...cfg,
      flipDuration: 0.01,
      flipStagger: 0,
      cameraTweenDuration: 0.01,
    };
  }
  return cfg;
}

function PhotoGallery() {
  const [boot] = useState(() => buildTopAlignedHome(loadSavedDefaults()));
  const [debugControls] = useState(() => isDebugControlsEnabled());

  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const cameraProxyRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const cameraTweenRef = useRef(null);
  const viewportSizeRef = useRef({ width: 0, height: 0, left: 0, top: 0 });
  const paintRafRef = useRef(0);
  const canvasSizeRef = useRef(boot.canvas);
  const homeCanvasRef = useRef(boot.canvas);
  const contentBoundsRef = useRef(boundsFromHome(boot.byId));
  const layoutsRef = useRef(
    Object.fromEntries(boot.photos.map((photo) => [photo.id, { ...photo }])),
  );
  const homeRef = useRef(
    Object.fromEntries(boot.photos.map((photo) => [photo.id, { ...photo }])),
  );
  const photoListRef = useRef(boot.photos);
  const flipBusyRef = useRef(false);
  const focusedIdRef = useRef(null);
  const settingsRef = useRef(loadSavedDefaults());
  const flipStaggerRef = useRef(null);
  const velocityRef = useRef({ vx: 0, vy: 0, t: 0 });
  const inertiaRafRef = useRef(0);
  const isMobileRef = useRef(isMobileViewport());
  const loadedIdsRef = useRef(new Set());

  const [settings, setSettings] = useState(() => loadSavedDefaults());
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [controlsOpen, setControlsOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [photoList, setPhotoList] = useState(boot.photos);
  const [layouts, setLayouts] = useState(() =>
    Object.fromEntries(boot.photos.map((photo) => [photo.id, { ...photo }])),
  );
  const [focusedId, setFocusedId] = useState(null);
  const [hintVisible, setHintVisible] = useState(() => !hasSeenHint());
  const [isDragging, setIsDragging] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [canvasSize, setCanvasSize] = useState(boot.canvas);
  const [footerY, setFooterY] = useState(boot.footerY);
  const [hiResIds, setHiResIds] = useState(() => new Set());
  const [visibleIds, setVisibleIds] = useState(() => new Set(boot.photos.slice(0, 8).map((p) => p.id)));

  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const movedRef = useRef(false);
  const pressTargetRef = useRef(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [deviceEpoch, setDeviceEpoch] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    const sync = () => {
      const mobile = media.matches;
      const wasMobile = isMobileRef.current;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
      if (wasMobile !== mobile) {
        const next = loadSavedDefaults();
        settingsRef.current = next;
        setSettings(next);
        setDeviceEpoch((n) => n + 1);
      }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const appearanceStyle = useMemo(
    () => ({
      '--photo-radius': `${settings.borderRadius}px`,
      '--photo-hover-scale': settings.hoverScale,
      '--focus-shadow': `0 ${settings.focusShadowY}px ${settings.focusShadowBlur}px rgba(20, 20, 20, ${settings.focusShadowOpacity})`,
    }),
    [settings],
  );

  const focusedPhoto = focusedId
    ? photoList.find((photo) => photo.id === focusedId) ?? null
    : null;

  const measureViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return viewportSizeRef.current;
    const rect = viewport.getBoundingClientRect();
    viewportSizeRef.current = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };
    return viewportSizeRef.current;
  }, []);

  const paintCamera = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, scale } = cameraRef.current;
    canvas.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale})`;
  }, []);

  const schedulePaint = useCallback(() => {
    if (paintRafRef.current) return;
    paintRafRef.current = requestAnimationFrame(() => {
      paintRafRef.current = 0;
      paintCamera();
    });
  }, [paintCamera]);

  const applyCamera = useCallback(
    (next, { immediate = false } = {}) => {
      const cfg = settingsRef.current;
      let { width, height } = viewportSizeRef.current;
      if (!width || !height) {
        ({ width, height } = measureViewport());
      }

      const canvas = canvasSizeRef.current;
      const scale = clamp(next.scale, cfg.minScale, cfg.maxScale);
      const pad = cfg.panBoundsPad;
      const minX = width - canvas.width * scale - width * pad;
      const maxX = width * pad;
      const minY = height - canvas.height * scale - height * pad;
      const maxY = height * pad;

      cameraRef.current = {
        x: clamp(next.x, minX, maxX),
        y: clamp(next.y, minY, maxY),
        scale,
      };
      cameraProxyRef.current.x = cameraRef.current.x;
      cameraProxyRef.current.y = cameraRef.current.y;
      cameraProxyRef.current.scale = cameraRef.current.scale;

      if (immediate) {
        if (paintRafRef.current) {
          cancelAnimationFrame(paintRafRef.current);
          paintRafRef.current = 0;
        }
        paintCamera();
      } else {
        schedulePaint();
      }
    },
    [measureViewport, paintCamera, schedulePaint],
  );

  const killCameraTween = useCallback(() => {
    if (cameraTweenRef.current) {
      cameraTweenRef.current.kill();
      cameraTweenRef.current = null;
    }
  }, []);

  const tweenCameraTo = useCallback(
    (target, duration, ease) => {
      killCameraTween();
      const cfg = settingsRef.current;
      let { width, height } = viewportSizeRef.current;
      if (!width || !height) {
        ({ width, height } = measureViewport());
      }
      const canvas = canvasSizeRef.current;
      const pad = cfg.panBoundsPad;
      const scale = clamp(target.scale, cfg.minScale, cfg.maxScale);
      const minX = width - canvas.width * scale - width * pad;
      const maxX = width * pad;
      const minY = height - canvas.height * scale - height * pad;
      const maxY = height * pad;
      const end = {
        x: clamp(target.x, minX, maxX),
        y: clamp(target.y, minY, maxY),
        scale,
      };

      if (duration <= 0.02) {
        applyCamera(end, { immediate: true });
        return;
      }

      cameraProxyRef.current.x = cameraRef.current.x;
      cameraProxyRef.current.y = cameraRef.current.y;
      cameraProxyRef.current.scale = cameraRef.current.scale;

      cameraTweenRef.current = gsap.to(cameraProxyRef.current, {
        x: end.x,
        y: end.y,
        scale: end.scale,
        duration,
        ease,
        onUpdate: () => {
          cameraRef.current = {
            x: cameraProxyRef.current.x,
            y: cameraProxyRef.current.y,
            scale: cameraProxyRef.current.scale,
          };
          paintCamera();
        },
        onComplete: () => {
          cameraTweenRef.current = null;
          applyCamera(end, { immediate: true });
        },
      });
    },
    [applyCamera, killCameraTween, measureViewport, paintCamera],
  );

  const stopInertia = useCallback(() => {
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = 0;
    }
    velocityRef.current = { vx: 0, vy: 0, t: 0 };
  }, []);

  const startInertia = useCallback(() => {
    if (!isMobileRef.current) return;
    const { vx, vy } = velocityRef.current;
    if (Math.hypot(vx, vy) < 0.35) return;

    let last = performance.now();
    let curVx = vx;
    let curVy = vy;

    const tick = (now) => {
      const dt = Math.min(32, now - last);
      last = now;
      const friction = Math.pow(0.92, dt / 16.67);
      curVx *= friction;
      curVy *= friction;

      if (Math.hypot(curVx, curVy) < 0.12) {
        inertiaRafRef.current = 0;
        return;
      }

      const cam = cameraRef.current;
      applyCamera({
        x: cam.x + curVx * dt,
        y: cam.y + curVy * dt,
        scale: cam.scale,
      });
      inertiaRafRef.current = requestAnimationFrame(tick);
    };

    inertiaRafRef.current = requestAnimationFrame(tick);
  }, [applyCamera]);

  const getOverviewCamera = useCallback(() => {
    const cfg = settingsRef.current;
    let { width } = viewportSizeRef.current;
    if (!width) {
      ({ width } = measureViewport());
    }

    const bounds = contentBoundsRef.current;
    const contentW = bounds.maxX - bounds.minX + cfg.overviewGap * 2;
    const scale = Math.min(cfg.maxScale, (width * cfg.overviewFitX) / contentW);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const top = cfg.overviewTop ?? 96;
    return {
      x: width / 2 - centerX * scale,
      y: top - bounds.minY * scale,
      scale,
    };
  }, [measureViewport]);

  const fitOverview = useCallback(() => {
    measureViewport();
    applyCamera(getOverviewCamera(), { immediate: true });
  }, [applyCamera, getOverviewCamera, measureViewport]);

  const zoomAt = useCallback(
    (clientX, clientY, factor) => {
      killCameraTween();
      const cfg = settingsRef.current;
      let { width, height, left, top } = viewportSizeRef.current;
      if (!width || !height) {
        ({ width, height, left, top } = measureViewport());
      }

      const { x, y, scale } = cameraRef.current;
      const nextScale = clamp(scale * factor, cfg.minScale, cfg.maxScale);
      const px = clientX - left;
      const py = clientY - top;
      const worldX = (px - x) / scale;
      const worldY = (py - y) / scale;

      applyCamera({
        x: px - worldX * nextScale,
        y: py - worldY * nextScale,
        scale: nextScale,
      });
    },
    [applyCamera, killCameraTween, measureViewport],
  );

  const applyLayouts = useCallback((nextLayouts) => {
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
  }, []);

  const updateVisiblePhotos = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = viewportSizeRef.current;
    if (!width || !height) return;

    const cam = cameraRef.current;
    const viewLeft = -cam.x / cam.scale;
    const viewTop = -cam.y / cam.scale;
    const viewRight = viewLeft + width / cam.scale;
    const viewBottom = viewTop + height / cam.scale;
    const pad = 400;

    const next = new Set();
    for (const photo of photoListRef.current) {
      const layout = layoutsRef.current[photo.id] ?? photo;
      const intersects =
        layout.x < viewRight + pad &&
        layout.x + layout.w > viewLeft - pad &&
        layout.y < viewBottom + pad &&
        layout.y + layout.h > viewTop - pad;
      if (intersects || focusedIdRef.current === photo.id) {
        next.add(photo.id);
        loadedIdsRef.current.add(photo.id);
      } else if (loadedIdsRef.current.has(photo.id)) {
        next.add(photo.id);
      }
    }
    setVisibleIds((prev) => {
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  }, []);

  const runFlip = useCallback((mutate, { onComplete } = {}) => {
    if (!canvasRef.current) return;
    if (flipBusyRef.current) {
      Flip.killFlipsOf(canvasRef.current.querySelectorAll('.gallery-photo'));
      flipBusyRef.current = false;
    }
    flipBusyRef.current = true;
    setIsFlipping(true);

    const nodes = canvasRef.current.querySelectorAll('.gallery-photo');
    const state = Flip.getState(nodes, { props: 'borderRadius,boxShadow' });
    const cfg = motionConfig(settingsRef.current);

    flushSync(() => {
      mutate();
    });

    const staggerFn = flipStaggerRef.current;

    Flip.from(state, {
      absolute: true,
      duration: cfg.flipDuration,
      ease: cfg.flipEase,
      force3D: true,
      stagger: staggerFn
        ? (index, target) => staggerFn(index, target)
        : { amount: cfg.flipStagger, from: 'center' },
      nested: true,
      onComplete: () => {
        flipBusyRef.current = false;
        flipStaggerRef.current = null;
        setIsFlipping(false);
        onComplete?.();
      },
    });
  }, []);

  const focusPhoto = useCallback(
    (photoId) => {
      const home = homeRef.current[photoId];
      if (!home) return;

      const cfg = motionConfig(settingsRef.current);
      const size = measureViewport();
      const { focusRect, camera } = computeCanonicalFocus(home, size, cfg);
      stopInertia();
      killCameraTween();

      const result = buildFocusLayouts(
        photoId,
        focusRect,
        homeRef.current,
        layoutsRef.current,
        cfg,
        homeCanvasRef.current,
      );

      // Apply canvas expand before camera tween so pan bounds are correct.
      canvasSizeRef.current = result.canvas;
      setCanvasSize(result.canvas);

      const layoutsNext = result.layouts;
      const focusLayout = layoutsNext[photoId];
      const shiftedCamera = {
        scale: camera.scale,
        x: size.width / 2 - (focusLayout.x + focusLayout.w / 2) * camera.scale,
        y: size.height / 2 - (focusLayout.y + focusLayout.h / 2) * camera.scale,
      };

      tweenCameraTo(shiftedCamera, cfg.cameraTweenDuration, cfg.flipEase);

      runFlip(() => {
        if (cfg.staggerByDistance) {
          let maxDist = 1;
          const distances = {};
          for (const id of Object.keys(layoutsNext)) {
            const layout = layoutsNext[id];
            const dist = Math.hypot(
              layout.x + layout.w / 2 - (focusLayout.x + focusLayout.w / 2),
              layout.y + layout.h / 2 - (focusLayout.y + focusLayout.h / 2),
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
        setHiResIds((prev) => new Set(prev).add(photoId));
        applyLayouts(layoutsNext);
      }, { onComplete: () => updateVisiblePhotos() });
    },
    [
      applyLayouts,
      killCameraTween,
      measureViewport,
      runFlip,
      stopInertia,
      tweenCameraTo,
      updateVisiblePhotos,
    ],
  );

  const goOverview = useCallback(() => {
    flipStaggerRef.current = null;
    stopInertia();

    canvasSizeRef.current = homeCanvasRef.current;
    setCanvasSize(homeCanvasRef.current);

    const cfg = motionConfig(settingsRef.current);
    const overviewCam = getOverviewCamera();

    runFlip(() => {
      const next = Object.fromEntries(
        photoListRef.current.map((photo) => [photo.id, { ...homeRef.current[photo.id] }]),
      );
      focusedIdRef.current = null;
      setFocusedId(null);
      applyLayouts(next);
    }, { onComplete: () => updateVisiblePhotos() });

    tweenCameraTo(overviewCam, cfg.cameraTweenDuration, cfg.flipEase);
  }, [
    applyLayouts,
    getOverviewCamera,
    runFlip,
    stopInertia,
    tweenCameraTo,
    updateVisiblePhotos,
  ]);

  const applyHomeLayout = useCallback(
    (cfg, { animate = false } = {}) => {
      const home = buildTopAlignedHome(cfg);
      homeCanvasRef.current = home.canvas;
      canvasSizeRef.current = home.canvas;
      contentBoundsRef.current = boundsFromHome(home.byId);
      photoListRef.current = home.photos;
      homeRef.current = Object.fromEntries(home.photos.map((photo) => [photo.id, { ...photo }]));
      setCanvasSize(home.canvas);
      setFooterY(home.footerY);
      setPhotoList(home.photos);

      const nextLayouts = Object.fromEntries(home.photos.map((photo) => [photo.id, { ...photo }]));

      if (focusedIdRef.current) {
        // Drop focus so grid rebuild stays coherent.
        focusedIdRef.current = null;
        setFocusedId(null);
      }

      if (animate) {
        runFlip(() => {
          applyLayouts(nextLayouts);
        }, { onComplete: () => updateVisiblePhotos() });
        tweenCameraTo(getOverviewCamera(), motionConfig(cfg).cameraTweenDuration, cfg.flipEase);
      } else {
        applyLayouts(nextLayouts);
        applyCamera(getOverviewCamera(), { immediate: true });
        queueMicrotask(() => updateVisiblePhotos());
      }
    },
    [applyCamera, applyLayouts, getOverviewCamera, runFlip, tweenCameraTo, updateVisiblePhotos],
  );

  useEffect(() => {
    if (deviceEpoch === 0) return;
    applyHomeLayout(settingsRef.current, { animate: false });
  }, [deviceEpoch, applyHomeLayout]);

  const updateSetting = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        settingsRef.current = next;
        if (GRID_KEYS.has(key)) {
          queueMicrotask(() => applyHomeLayout(next, { animate: true }));
        }
        return next;
      });
      setSavedNotice('');
    },
    [applyHomeLayout],
  );

  const handleSetDefault = useCallback(() => {
    saveAsDefault(settingsRef.current);
    setSavedNotice('Saved as default');
  }, []);

  const handleResetSaved = useCallback(() => {
    const saved = loadSavedDefaults();
    settingsRef.current = saved;
    setSettings(saved);
    setSavedNotice('Loaded default');
    applyHomeLayout(saved, { animate: true });
  }, [applyHomeLayout]);

  const handleResetFactory = useCallback(() => {
    clearSavedDefaults();
    const next = getDeviceDefaults();
    settingsRef.current = next;
    setSettings(next);
    setSavedNotice('Factory reset');
    applyHomeLayout(next, { animate: true });
  }, [applyHomeLayout]);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    markHintSeen();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fitOverview();
      updateVisiblePhotos();
    });
    const onResize = () => {
      measureViewport();
      if (!focusedIdRef.current) fitOverview();
      updateVisiblePhotos();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      if (paintRafRef.current) cancelAnimationFrame(paintRafRef.current);
      if (inertiaRafRef.current) cancelAnimationFrame(inertiaRafRef.current);
      killCameraTween();
    };
  }, [fitOverview, killCameraTween, measureViewport, updateVisiblePhotos]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      event.preventDefault();
      dismissHint();
      const cfg = settingsRef.current;
      const factor = event.deltaY > 0 ? cfg.wheelZoomOut : cfg.wheelZoomIn;
      zoomAt(event.clientX, event.clientY, factor);
      updateVisiblePhotos();
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [dismissHint, updateVisiblePhotos, zoomAt]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && focusedIdRef.current) goOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOverview]);

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (flipBusyRef.current) return;
    if (event.target.closest?.('.gc, .footer, .header a, .gallery-close, .gallery-focus-meta, a')) {
      return;
    }

    stopInertia();
    killCameraTween();
    dismissHint();
    movedRef.current = false;
    measureViewport();
    velocityRef.current = { vx: 0, vy: 0, t: performance.now() };

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
        lastX: event.clientX,
        lastY: event.clientY,
        lastT: performance.now(),
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
      velocityRef.current = { vx: 0, vy: 0, t: performance.now() };
      zoomAt(midX, midY, (pinchRef.current.scale * factor) / cameraRef.current.scale);
      return;
    }

    if (!dragRef.current) return;

    const now = performance.now();
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > settingsRef.current.dragThreshold) {
      movedRef.current = true;
      pressTargetRef.current = null;
    }

    if (!movedRef.current) return;

    const frameDx = event.clientX - dragRef.current.lastX;
    const frameDy = event.clientY - dragRef.current.lastY;
    const frameDt = Math.max(1, now - dragRef.current.lastT);
    velocityRef.current = {
      vx: frameDx / frameDt,
      vy: frameDy / frameDt,
      t: now,
    };
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastT = now;

    applyCamera({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
      scale: cameraRef.current.scale,
    });
  };

  const endPointer = (event) => {
    const photoId = pressTargetRef.current;
    const wasTap = !movedRef.current && pointersRef.current.size === 1;
    const shouldInertia = movedRef.current && pointersRef.current.size === 1;

    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    if (pointersRef.current.size === 1) {
      const remaining = [...pointersRef.current.entries()][0];
      dragRef.current = {
        startX: remaining[1].x,
        startY: remaining[1].y,
        originX: cameraRef.current.x,
        originY: cameraRef.current.y,
        lastX: remaining[1].x,
        lastY: remaining[1].y,
        lastT: performance.now(),
      };
    }

    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setIsDragging(false);
      pressTargetRef.current = null;
      updateVisiblePhotos();

      if (wasTap && photoId && !flipBusyRef.current) {
        if (focusedIdRef.current === photoId) {
          goOverview();
        } else {
          focusPhoto(photoId);
        }
      } else if (shouldInertia) {
        startInertia();
      }
    }
  };

  return (
    <div
      className={`gallery ${isMobile ? 'is-mobile' : ''} ${isDragging ? 'is-dragging' : ''} ${isFlipping ? 'is-flipping' : ''} ${focusedId ? 'is-focused-mode' : ''}`}
      style={appearanceStyle}
    >
      <Header active="photography" />

      {focusedId && (
        <button
          type="button"
          className="gallery-close"
          onClick={goOverview}
          aria-label="Back to overview"
        >
          Overview
        </button>
      )}

      {focusedPhoto && (
        <div className="gallery-focus-meta" aria-live="polite">
          <p className="gallery-focus-caption">{focusedPhoto.caption || focusedPhoto.title}</p>
          <p className="gallery-focus-title">{focusedPhoto.title || focusedPhoto.alt}</p>
        </div>
      )}

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
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        >
          {photoList.map((photo, index) => {
            const layout = layouts[photo.id] ?? photo;
            const shouldLoad = visibleIds.has(photo.id) || focusedId === photo.id;
            const useHiRes = hiResIds.has(photo.id) || focusedId === photo.id;
            return (
              <button
                key={photo.id}
                type="button"
                data-photo-id={photo.id}
                data-flip-id={photo.id}
                className={`gallery-photo ${focusedId === photo.id ? 'is-focused' : ''} ${focusedId && focusedId !== photo.id ? 'is-dimmed' : ''}`}
                style={{
                  left: layout.x,
                  top: layout.y,
                  width: layout.w,
                  height: layout.h,
                  zIndex: focusedId === photo.id ? 5 : 1,
                  '--enter-i': Math.min(index, 16),
                }}
                aria-label={photo.alt}
              >
                {shouldLoad ? (
                  <img
                    src={useHiRes ? photo.srcFocus || photo.src : photo.src}
                    alt={photo.alt}
                    draggable={false}
                    loading={index < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                ) : (
                  <span className="gallery-photo-placeholder" aria-hidden="true" />
                )}
                {settings.showCaptions && photo.caption ? (
                  <span className="gallery-caption">{photo.caption}</span>
                ) : null}
              </button>
            );
          })}

          <Footer
            className="gallery-canvas-footer"
            style={{
              top: footerY,
              left: settings.gridPad ?? 120,
              width: Math.max(
                280,
                canvasSize.width - (settings.gridPad ?? 120) * 2,
              ),
            }}
          />
        </div>

        {hintVisible && settings.showHint && !focusedId && (
          <div className="gallery-hint" aria-hidden="true">
            <span>Drag</span>
            <span className="gallery-hint-dot" />
            <span>{isMobile ? 'Pinch' : 'Scroll'}</span>
            <span className="gallery-hint-dot" />
            <span>{isMobile ? 'Tap' : 'Click'}</span>
          </div>
        )}
      </div>

      {debugControls && (
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
      )}
    </div>
  );
}

export default PhotoGallery;
