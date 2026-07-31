import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Flip } from 'gsap/Flip';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Observer } from 'gsap/Observer';
import { SplitText } from 'gsap/SplitText';
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

gsap.registerPlugin(Flip, Observer, InertiaPlugin, SplitText, CustomEase);
gsap.ticker.fps(60);
gsap.ticker.lagSmoothing(500, 33);
CustomEase.create('agckRoam', 'M0,0 C0.16,0.84 0.22,1 1,1');

const GRID_KEYS = new Set([
  'gridColumns',
  'gridGap',
  'gridPad',
  'columnWidth',
  'showCaptions',
  'layoutScatter',
]);

const OBSERVER_IGNORE = '.gc, .footer, .header a, .gallery-close, .gallery-focus-meta, a';

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
      mouseFollowStrength: 0,
      idleDriftAmp: 0,
      desktopInertia: false,
    };
  }
  return cfg;
}

function touchDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
}

function PhotoGallery() {
  const [boot] = useState(() => buildTopAlignedHome(loadSavedDefaults()));
  const [debugControls] = useState(() => isDebugControlsEnabled());

  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const focusTitleRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const cameraProxyRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const cameraTweenRef = useRef(null);
  const inertiaTweenRef = useRef(null);
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
  const isMobileRef = useRef(isMobileViewport());
  const loadedIdsRef = useRef(new Set());
  const viewOffsetRef = useRef({ x: 0, y: 0 });
  const cursorNormRef = useRef({ x: 0, y: 0 });
  const lastPointerActivityRef = useRef(0);
  const roamRafRef = useRef(0);
  const isDraggingRef = useRef(false);
  const inertiaActiveRef = useRef(false);
  const pinchingRef = useRef(false);
  const pinchRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const pressTargetRef = useRef(null);
  const offsetXToRef = useRef(null);
  const offsetYToRef = useRef(null);
  const observerRef = useRef(null);

  // Stable callbacks for Observer (created once, reads refs)
  const apiRef = useRef({});

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
  const [deviceEpoch, setDeviceEpoch] = useState(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
    const ox = viewOffsetRef.current.x;
    const oy = viewOffsetRef.current.y;
    canvas.style.transform = `translate3d(${(x + ox).toFixed(2)}px, ${(y + oy).toFixed(2)}px, 0) scale(${scale})`;
  }, []);

  const schedulePaint = useCallback(() => {
    if (paintRafRef.current) return;
    paintRafRef.current = requestAnimationFrame(() => {
      paintRafRef.current = 0;
      paintCamera();
    });
  }, [paintCamera]);

  const hardZeroViewOffset = useCallback(() => {
    gsap.killTweensOf(viewOffsetRef.current);
    gsap.set(viewOffsetRef.current, { x: 0, y: 0 });
  }, []);

  const notePointerActivity = useCallback(() => {
    lastPointerActivityRef.current = performance.now();
  }, []);

  const getPanBounds = useCallback(
    (scale) => {
      const cfg = settingsRef.current;
      let { width, height } = viewportSizeRef.current;
      if (!width || !height) {
        ({ width, height } = measureViewport());
      }
      const canvas = canvasSizeRef.current;
      const pad = cfg.panBoundsPad;
      return {
        minX: width - canvas.width * scale - width * pad,
        maxX: width * pad,
        minY: height - canvas.height * scale - height * pad,
        maxY: height * pad,
      };
    },
    [measureViewport],
  );

  const applyCamera = useCallback(
    (next, { immediate = false } = {}) => {
      const cfg = settingsRef.current;
      const scale = clamp(next.scale, cfg.minScale, cfg.maxScale);
      const bounds = getPanBounds(scale);

      cameraRef.current = {
        x: clamp(next.x, bounds.minX, bounds.maxX),
        y: clamp(next.y, bounds.minY, bounds.maxY),
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
    [getPanBounds, paintCamera, schedulePaint],
  );

  const syncCameraFromProxy = useCallback(() => {
    const cfg = settingsRef.current;
    const scale = clamp(cameraProxyRef.current.scale, cfg.minScale, cfg.maxScale);
    const bounds = getPanBounds(scale);
    cameraProxyRef.current.x = clamp(cameraProxyRef.current.x, bounds.minX, bounds.maxX);
    cameraProxyRef.current.y = clamp(cameraProxyRef.current.y, bounds.minY, bounds.maxY);
    cameraProxyRef.current.scale = scale;
    cameraRef.current = {
      x: cameraProxyRef.current.x,
      y: cameraProxyRef.current.y,
      scale: cameraProxyRef.current.scale,
    };
    paintCamera();
  }, [getPanBounds, paintCamera]);

  const killCameraTween = useCallback(() => {
    if (cameraTweenRef.current) {
      cameraTweenRef.current.kill();
      cameraTweenRef.current = null;
    }
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaTweenRef.current) {
      inertiaTweenRef.current.kill();
      inertiaTweenRef.current = null;
    }
    inertiaActiveRef.current = false;
  }, []);

  const tweenCameraTo = useCallback(
    (target, duration, ease) => {
      killCameraTween();
      stopInertia();
      const cfg = settingsRef.current;
      const scale = clamp(target.scale, cfg.minScale, cfg.maxScale);
      const bounds = getPanBounds(scale);
      const end = {
        x: clamp(target.x, bounds.minX, bounds.maxX),
        y: clamp(target.y, bounds.minY, bounds.maxY),
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
        ease: ease || 'agckRoam',
        onUpdate: syncCameraFromProxy,
        onComplete: () => {
          cameraTweenRef.current = null;
          applyCamera(end, { immediate: true });
        },
      });
    },
    [applyCamera, getPanBounds, killCameraTween, stopInertia, syncCameraFromProxy],
  );

  const throwCamera = useCallback(
    (velocityX, velocityY) => {
      const cfg = motionConfig(settingsRef.current);
      const mobile = isMobileRef.current;
      if (!mobile && !cfg.desktopInertia) return;
      if (prefersReducedMotion()) return;

      const speed = Math.hypot(velocityX, velocityY);
      if (speed < 80) return;

      hardZeroViewOffset();
      stopInertia();
      killCameraTween();
      inertiaActiveRef.current = true;

      cameraProxyRef.current.x = cameraRef.current.x;
      cameraProxyRef.current.y = cameraRef.current.y;
      cameraProxyRef.current.scale = cameraRef.current.scale;

      const resistance = cfg.inertiaResistance ?? (mobile ? 28 : 22);
      const scale = cameraProxyRef.current.scale;
      const bounds = getPanBounds(scale);

      inertiaTweenRef.current = gsap.to(cameraProxyRef.current, {
        inertia: {
          x: {
            velocity: velocityX,
            min: bounds.minX,
            max: bounds.maxX,
          },
          y: {
            velocity: velocityY,
            min: bounds.minY,
            max: bounds.maxY,
          },
          resistance,
        },
        onUpdate: syncCameraFromProxy,
        onComplete: () => {
          inertiaTweenRef.current = null;
          inertiaActiveRef.current = false;
          applyCamera(cameraRef.current, { immediate: true });
          apiRef.current.updateVisiblePhotos?.();
        },
      });
    },
    [
      applyCamera,
      getPanBounds,
      hardZeroViewOffset,
      killCameraTween,
      stopInertia,
      syncCameraFromProxy,
    ],
  );

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
      stopInertia();
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
    [applyCamera, killCameraTween, measureViewport, stopInertia],
  );

  const applyLayouts = useCallback((nextLayouts) => {
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
  }, []);

  const updateVisiblePhotos = useCallback(() => {
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
      ease: cfg.flipEase || 'agckRoam',
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
      hardZeroViewOffset();
      paintCamera();

      const result = buildFocusLayouts(
        photoId,
        focusRect,
        homeRef.current,
        layoutsRef.current,
        cfg,
        homeCanvasRef.current,
      );

      canvasSizeRef.current = result.canvas;
      setCanvasSize(result.canvas);

      const layoutsNext = result.layouts;
      const focusLayout = layoutsNext[photoId];
      const shiftedCamera = {
        scale: camera.scale,
        x: size.width / 2 - (focusLayout.x + focusLayout.w / 2) * camera.scale,
        y: size.height / 2 - (focusLayout.y + focusLayout.h / 2) * camera.scale,
      };

      const ease = cfg.flipEase || 'agckRoam';

      // Choreograph: offset already zeroed → camera + Flip in parallel (SplitText on title mount)
      const focusTl = gsap.timeline({ defaults: { ease } });
      focusTl.add(() => {
        tweenCameraTo(shiftedCamera, cfg.cameraTweenDuration, ease);
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
      }, 0);
    },
    [
      applyLayouts,
      hardZeroViewOffset,
      killCameraTween,
      measureViewport,
      paintCamera,
      runFlip,
      stopInertia,
      tweenCameraTo,
      updateVisiblePhotos,
    ],
  );

  const goOverview = useCallback(() => {
    flipStaggerRef.current = null;
    stopInertia();
    hardZeroViewOffset();
    paintCamera();

    canvasSizeRef.current = homeCanvasRef.current;
    setCanvasSize(homeCanvasRef.current);

    const cfg = motionConfig(settingsRef.current);
    const overviewCam = getOverviewCamera();
    const ease = cfg.flipEase || 'agckRoam';

    runFlip(() => {
      const next = Object.fromEntries(
        photoListRef.current.map((photo) => [photo.id, { ...homeRef.current[photo.id] }]),
      );
      focusedIdRef.current = null;
      setFocusedId(null);
      applyLayouts(next);
    }, { onComplete: () => updateVisiblePhotos() });

    tweenCameraTo(overviewCam, cfg.cameraTweenDuration, ease);
  }, [
    applyLayouts,
    getOverviewCamera,
    hardZeroViewOffset,
    paintCamera,
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
        focusedIdRef.current = null;
        setFocusedId(null);
      }

      if (animate) {
        runFlip(() => {
          applyLayouts(nextLayouts);
        }, { onComplete: () => updateVisiblePhotos() });
        tweenCameraTo(
          getOverviewCamera(),
          motionConfig(cfg).cameraTweenDuration,
          cfg.flipEase || 'agckRoam',
        );
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

  // Keep latest handlers available to Observer without recreating it.
  useEffect(() => {
    apiRef.current = {
      applyCamera,
      zoomAt,
      focusPhoto,
      goOverview,
      throwCamera,
      hardZeroViewOffset,
      notePointerActivity,
      dismissHint,
      measureViewport,
      updateVisiblePhotos,
      paintCamera,
      stopInertia,
      killCameraTween,
    };
  }, [
    applyCamera,
    dismissHint,
    focusPhoto,
    goOverview,
    hardZeroViewOffset,
    killCameraTween,
    measureViewport,
    notePointerActivity,
    paintCamera,
    stopInertia,
    throwCamera,
    updateVisiblePhotos,
    zoomAt,
  ]);

  // quickTo helpers for mouse-follow
  useEffect(() => {
    const duration = motionConfig(settingsRef.current).mouseFollowDuration ?? 0.45;
    offsetXToRef.current = gsap.quickTo(viewOffsetRef.current, 'x', {
      duration,
      ease: 'agckRoam',
      onUpdate: paintCamera,
    });
    offsetYToRef.current = gsap.quickTo(viewOffsetRef.current, 'y', {
      duration,
      ease: 'agckRoam',
      onUpdate: paintCamera,
    });
  }, [paintCamera, settings.mouseFollowDuration]);

  // Idle drift + follow target updates via quickTo
  useEffect(() => {
    lastPointerActivityRef.current = performance.now();
    let lastTx = 0;
    let lastTy = 0;

    const tickRoam = (now) => {
      roamRafRef.current = requestAnimationFrame(tickRoam);
      const cfg = motionConfig(settingsRef.current);

      const roamAllowed =
        !prefersReducedMotion() &&
        !isMobileRef.current &&
        !focusedIdRef.current &&
        !flipBusyRef.current &&
        !isDraggingRef.current &&
        !inertiaActiveRef.current &&
        !cameraTweenRef.current &&
        !pinchingRef.current;

      let tx = 0;
      let ty = 0;

      if (roamAllowed) {
        const strength =
          (cfg.mouseFollowStrength ?? 0) / Math.max(cameraRef.current.scale, 0.25);
        tx = -cursorNormRef.current.x * strength;
        ty = -cursorNormRef.current.y * strength;

        const idleAmp = cfg.idleDriftAmp ?? 0;
        if (idleAmp > 0 && now - lastPointerActivityRef.current > 1500) {
          const t = now * 0.001;
          tx += Math.sin(t * 0.35) * idleAmp;
          ty += Math.cos(t * 0.28) * idleAmp * 0.7;
        }
      }

      if (Math.abs(tx - lastTx) > 0.05 || Math.abs(ty - lastTy) > 0.05) {
        lastTx = tx;
        lastTy = ty;
        offsetXToRef.current?.(tx);
        offsetYToRef.current?.(ty);
      }
    };

    roamRafRef.current = requestAnimationFrame(tickRoam);
    return () => {
      if (roamRafRef.current) cancelAnimationFrame(roamRafRef.current);
      roamRafRef.current = 0;
    };
  }, []);

  // GSAP Observer: pan / wheel zoom / click-to-focus
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = Observer.create({
      target: viewport,
      type: 'wheel,touch,pointer',
      debounce: false,
      dragMinimum: settingsRef.current.dragThreshold ?? 5,
      ignore: OBSERVER_IGNORE,
      onPress(self) {
        if (flipBusyRef.current || pinchingRef.current) return;
        const api = apiRef.current;
        api.stopInertia();
        api.killCameraTween();
        api.hardZeroViewOffset();
        api.paintCamera();
        api.notePointerActivity();
        api.dismissHint();
        api.measureViewport();

        dragOriginRef.current = {
          x: cameraRef.current.x,
          y: cameraRef.current.y,
        };

        const photoEl = self.event?.target?.closest?.('[data-photo-id]');
        pressTargetRef.current = photoEl?.getAttribute('data-photo-id') ?? null;
      },
      onDragStart() {
        if (pinchingRef.current) return;
        isDraggingRef.current = true;
        setIsDragging(true);
        pressTargetRef.current = null;
      },
      onDrag(self) {
        if (pinchingRef.current || flipBusyRef.current) return;
        const api = apiRef.current;
        api.notePointerActivity();
        api.applyCamera({
          x: dragOriginRef.current.x + (self.x - self.startX),
          y: dragOriginRef.current.y + (self.y - self.startY),
          scale: cameraRef.current.scale,
        });
      },
      onDragEnd(self) {
        isDraggingRef.current = false;
        setIsDragging(false);
        if (pinchingRef.current) return;
        const api = apiRef.current;
        api.notePointerActivity();
        api.throwCamera(self.velocityX, self.velocityY);
        api.updateVisiblePhotos();
      },
      onClick(self) {
        if (pinchingRef.current || flipBusyRef.current) return;
        const api = apiRef.current;
        const photoEl = self.event?.target?.closest?.('[data-photo-id]');
        const photoId =
          photoEl?.getAttribute('data-photo-id') ?? pressTargetRef.current;
        pressTargetRef.current = null;
        if (!photoId) return;
        if (focusedIdRef.current === photoId) {
          api.goOverview();
        } else {
          api.focusPhoto(photoId);
        }
      },
      onWheel(self) {
        const event = self.event;
        event?.preventDefault?.();
        if (pinchingRef.current) return;
        const api = apiRef.current;
        api.dismissHint();
        api.notePointerActivity();
        api.hardZeroViewOffset();
        const cfg = settingsRef.current;
        const factor = (self.deltaY || 0) > 0 ? cfg.wheelZoomOut : cfg.wheelZoomIn;
        const clientX = event?.clientX ?? self.x;
        const clientY = event?.clientY ?? self.y;
        api.zoomAt(clientX, clientY, factor);
        api.updateVisiblePhotos();
      },
      onMove(self) {
        if (isMobileRef.current || isDraggingRef.current || pinchingRef.current) return;
        if (self.event?.pointerType && self.event.pointerType !== 'mouse') return;

        const api = apiRef.current;
        let { width, height, left, top } = viewportSizeRef.current;
        if (!width || !height) {
          ({ width, height, left, top } = api.measureViewport());
        }
        if (!width || !height) return;

        cursorNormRef.current = {
          x: clamp(((self.x - left) / width) * 2 - 1, -1, 1),
          y: clamp(((self.y - top) / height) * 2 - 1, -1, 1),
        };
        api.notePointerActivity();
      },
    });

    observerRef.current = observer;

    return () => {
      observer.kill();
      observerRef.current = null;
    };
  }, []);

  // Dedicated pinch (Observer does not model two-finger scale)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onTouchStart = (event) => {
      if (event.touches.length === 2) {
        pinchingRef.current = true;
        isDraggingRef.current = false;
        setIsDragging(false);
        pressTargetRef.current = null;
        apiRef.current.stopInertia();
        apiRef.current.killCameraTween();
        apiRef.current.hardZeroViewOffset();
        pinchRef.current = {
          distance: touchDistance(event.touches[0], event.touches[1]),
          scale: cameraRef.current.scale,
        };
      }
    };

    const onTouchMove = (event) => {
      if (!pinchingRef.current || event.touches.length < 2 || !pinchRef.current) return;
      event.preventDefault();
      const distance = touchDistance(event.touches[0], event.touches[1]);
      const factor = distance / pinchRef.current.distance;
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      apiRef.current.zoomAt(
        midX,
        midY,
        (pinchRef.current.scale * factor) / cameraRef.current.scale,
      );
      apiRef.current.notePointerActivity();
    };

    const onTouchEnd = (event) => {
      if (event.touches.length < 2) {
        pinchingRef.current = false;
        pinchRef.current = null;
        apiRef.current.updateVisiblePhotos();
      }
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    viewport.addEventListener('touchcancel', onTouchEnd);
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchEnd);
    };
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
      if (roamRafRef.current) cancelAnimationFrame(roamRafRef.current);
      stopInertia();
      killCameraTween();
    };
  }, [fitOverview, killCameraTween, measureViewport, stopInertia, updateVisiblePhotos]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && focusedIdRef.current) goOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOverview]);

  // SplitText reveal on focus title
  useEffect(() => {
    const el = focusTitleRef.current;
    if (!focusedId || !el || prefersReducedMotion()) return undefined;

    let split;
    try {
      split = SplitText.create(el, { type: 'chars,words', charsClass: 'gallery-focus-char' });
      gsap.from(split.chars, {
        y: 14,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.018,
        ease: 'agckRoam',
        delay: 0.12,
      });
    } catch {
      return undefined;
    }

    return () => {
      split?.revert?.();
    };
  }, [focusedId, focusedPhoto?.title]);

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
          <p ref={focusTitleRef} className="gallery-focus-title">
            {focusedPhoto.title || focusedPhoto.alt}
          </p>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`gallery-viewport ${isDragging ? 'is-dragging' : ''}`}
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
