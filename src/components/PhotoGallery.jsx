import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { CANVAS, photos as photoData } from '../data/photos';
import './PhotoGallery.css';

gsap.registerPlugin(Flip);

const MIN_SCALE = 0.18;
const MAX_SCALE = 3.2;
const GAP = 40;
const FOCUS_VIEW_PAD = 0.7;
const PUSH_GAP = 36;
const FLIP_DURATION = 0.95;
const FLIP_STAGGER = 0.22;

const contentBounds = photoData.reduce(
  (bounds, photo) => ({
    minX: Math.min(bounds.minX, photo.x),
    minY: Math.min(bounds.minY, photo.y),
    maxX: Math.max(bounds.maxX, photo.x + photo.w),
    maxY: Math.max(bounds.maxY, photo.y + photo.h),
  }),
  { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a, b, pad = 0) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function dominantSide(home, focusRect) {
  const cardCx = home.x + home.w / 2;
  const cardCy = home.y + home.h / 2;
  const focusCx = focusRect.x + focusRect.w / 2;
  const focusCy = focusRect.y + focusRect.h / 2;
  const dx = cardCx - focusCx;
  const dy = cardCy - focusCy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}

/** Axis-only push clear of the focus rect (N/S/E/W). */
function pushClearOf(home, focusRect) {
  const side = dominantSide(home, focusRect);
  let x = home.x;
  let y = home.y;

  if (side === 'east') {
    x = focusRect.x + focusRect.w + PUSH_GAP;
  } else if (side === 'west') {
    x = focusRect.x - home.w - PUSH_GAP;
  } else if (side === 'south') {
    y = focusRect.y + focusRect.h + PUSH_GAP;
  } else {
    y = focusRect.y - home.h - PUSH_GAP;
  }

  return {
    id: home.id,
    side,
    x: clamp(x, -200, CANVAS.width - home.w + 200),
    y: clamp(y, -200, CANVAS.height - home.h + 200),
    w: home.w,
    h: home.h,
  };
}

/** Nudge same-side cards apart with a consistent gutter. */
function packSameSide(pushed) {
  const bySide = { north: [], south: [], east: [], west: [] };
  for (const card of pushed) {
    bySide[card.side].push({ ...card });
  }

  for (const side of Object.keys(bySide)) {
    const group = bySide[side];
    if (group.length < 2) continue;

    if (side === 'north' || side === 'south') {
      group.sort((a, b) => a.x - b.x);
      for (let i = 1; i < group.length; i += 1) {
        const prev = group[i - 1];
        const minX = prev.x + prev.w + PUSH_GAP;
        if (group[i].x < minX) group[i].x = minX;
      }
      for (let i = 1; i < group.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          if (!rectsOverlap(group[i], group[j])) continue;
          if (side === 'south') {
            group[i].y = Math.max(group[i].y, group[j].y + group[j].h + PUSH_GAP);
          } else {
            group[i].y = Math.min(group[i].y, group[j].y - group[i].h - PUSH_GAP);
          }
        }
      }
    } else {
      group.sort((a, b) => a.y - b.y);
      for (let i = 1; i < group.length; i += 1) {
        const prev = group[i - 1];
        const minY = prev.y + prev.h + PUSH_GAP;
        if (group[i].y < minY) group[i].y = minY;
      }
      for (let i = 1; i < group.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          if (!rectsOverlap(group[i], group[j])) continue;
          if (side === 'east') {
            group[i].x = Math.max(group[i].x, group[j].x + group[j].w + PUSH_GAP);
          } else {
            group[i].x = Math.min(group[i].x, group[j].x - group[i].w - PUSH_GAP);
          }
        }
      }
    }
  }

  const packed = [
    ...bySide.north,
    ...bySide.south,
    ...bySide.east,
    ...bySide.west,
  ];

  // Resolve leftover overlaps across different sides by pushing the second card further out.
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < packed.length; i += 1) {
      for (let j = i + 1; j < packed.length; j += 1) {
        const a = packed[i];
        const b = packed[j];
        if (!rectsOverlap(a, b, 0)) continue;

        if (b.side === 'east') {
          b.x = Math.max(b.x, a.x + a.w + PUSH_GAP);
        } else if (b.side === 'west') {
          b.x = Math.min(b.x, a.x - b.w - PUSH_GAP);
        } else if (b.side === 'south') {
          b.y = Math.max(b.y, a.y + a.h + PUSH_GAP);
        } else {
          b.y = Math.min(b.y, a.y - b.h - PUSH_GAP);
        }
      }
    }
  }

  return packed;
}

function buildFocusLayouts(photoId, focusRect, homes, currents) {
  const next = {};
  const pushedById = new Map();

  for (const photo of photoData) {
    const base = homes[photo.id];
    if (photo.id === photoId) {
      next[photo.id] = { ...base, ...focusRect };
      continue;
    }

    const current = currents[photo.id] ?? base;
    if (rectsOverlap(current, focusRect, PUSH_GAP) || rectsOverlap(base, focusRect, PUSH_GAP)) {
      pushedById.set(photo.id, pushClearOf(base, focusRect));
    } else {
      next[photo.id] = { ...base };
    }
  }

  // Cascade: if a home-staying card now collides with a pushed card, push it too.
  let grew = true;
  while (grew) {
    grew = false;
    const packed = packSameSide([...pushedById.values()]);
    pushedById.clear();
    for (const card of packed) {
      pushedById.set(card.id, card);
    }

    for (const photo of photoData) {
      if (photo.id === photoId || pushedById.has(photo.id)) continue;
      const staying = next[photo.id];
      if (!staying) continue;

      let hits = rectsOverlap(staying, focusRect, PUSH_GAP);
      if (!hits) {
        for (const card of pushedById.values()) {
          if (rectsOverlap(staying, card, PUSH_GAP)) {
            hits = true;
            break;
          }
        }
      }

      if (hits) {
        pushedById.set(photo.id, pushClearOf(homes[photo.id], focusRect));
        delete next[photo.id];
        grew = true;
      }
    }
  }

  for (const card of packSameSide([...pushedById.values()])) {
    next[card.id] = {
      id: card.id,
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.h,
    };
  }

  return next;
}

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

  const applyCamera = useCallback((next) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      cameraRef.current = next;
      setCamera(next);
      return;
    }

    const { width, height } = viewport.getBoundingClientRect();
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    const minX = width - CANVAS.width * scale - width * 0.25;
    const maxX = width * 0.25;
    const minY = height - CANVAS.height * scale - height * 0.25;
    const maxY = height * 0.25;

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
    if (!viewport) return cameraRef.current;

    const { width, height } = viewport.getBoundingClientRect();
    const contentW = contentBounds.maxX - contentBounds.minX + GAP * 2;
    const contentH = contentBounds.maxY - contentBounds.minY + GAP * 2;
    const scale = Math.min((width * 0.94) / contentW, (height * 0.9) / contentH);
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
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const { x, y, scale } = cameraRef.current;
      const nextScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
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

  const flipStaggerRef = useRef(null);

  const applyLayouts = useCallback((nextLayouts) => {
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
  }, []);

  const runFlip = useCallback((mutate) => {
    if (flipBusyRef.current || !canvasRef.current) return;
    flipBusyRef.current = true;

    const nodes = canvasRef.current.querySelectorAll('.gallery-photo');
    const state = Flip.getState(nodes);

    flushSync(() => {
      mutate();
    });

    const staggerFn = flipStaggerRef.current;

    Flip.from(state, {
      absolute: true,
      duration: FLIP_DURATION,
      ease: 'power3.inOut',
      stagger: staggerFn
        ? (index, target) => staggerFn(index, target)
        : { amount: FLIP_STAGGER, from: 'center' },
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

      const { width, height } = viewport.getBoundingClientRect();
      const cam = cameraRef.current;

      // Focus rect in world space: large card centered in the current view.
      const viewW = width / cam.scale;
      const viewH = height / cam.scale;
      const viewLeft = -cam.x / cam.scale;
      const viewTop = -cam.y / cam.scale;
      const aspect = home.w / home.h;

      let focusW = viewW * FOCUS_VIEW_PAD;
      let focusH = focusW / aspect;
      if (focusH > viewH * FOCUS_VIEW_PAD) {
        focusH = viewH * FOCUS_VIEW_PAD;
        focusW = focusH * aspect;
      }

      const focusRect = {
        x: viewLeft + (viewW - focusW) / 2,
        y: viewTop + (viewH - focusH) / 2,
        w: focusW,
        h: focusH,
      };

      const focusCx = focusRect.x + focusRect.w / 2;
      const focusCy = focusRect.y + focusRect.h / 2;

      runFlip(() => {
        const next = buildFocusLayouts(
          photoId,
          focusRect,
          homeRef.current,
          layoutsRef.current,
        );

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
          return ((distances[id] ?? 0) / maxDist) * FLIP_STAGGER;
        };

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
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
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
    if (Math.hypot(dx, dy) > 5) {
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
    <div className="gallery">
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

        {hintVisible && (
          <div className="gallery-hint" aria-hidden="true">
            <span>Drag to explore</span>
            <span className="gallery-hint-dot" />
            <span>Scroll to zoom</span>
            <span className="gallery-hint-dot" />
            <span>Click a photo</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoGallery;
