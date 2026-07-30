import { useCallback, useEffect, useRef, useState } from 'react';
import { CANVAS, photos } from '../data/photos';
import './PhotoGallery.css';

const MIN_SCALE = 0.22;
const MAX_SCALE = 2.8;
const FOCUS_PADDING = 0.72;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function PhotoGallery() {
  const viewportRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, scale: 0.45 });
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.45 });
  const [focusedId, setFocusedId] = useState(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const animRef = useRef(null);
  const movedRef = useRef(false);

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

  const cancelAnimation = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target, duration = 720) => {
      cancelAnimation();
      const from = { ...cameraRef.current };
      const start = performance.now();

      const tick = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const e = easeOutCubic(t);
        applyCamera({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          scale: from.scale + (target.scale - from.scale) * e,
        });
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = null;
        }
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [applyCamera, cancelAnimation],
  );

  const getOverviewCamera = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return cameraRef.current;

    const { width, height } = viewport.getBoundingClientRect();
    const scale = Math.min(
      (width * 0.92) / CANVAS.width,
      (height * 0.88) / CANVAS.height,
      0.55,
    );
    return {
      x: (width - CANVAS.width * scale) / 2,
      y: (height - CANVAS.height * scale) / 2,
      scale,
    };
  }, []);

  const fitOverview = useCallback(() => {
    applyCamera(getOverviewCamera());
  }, [applyCamera, getOverviewCamera]);

  const goOverview = useCallback(() => {
    setFocusedId(null);
    animateTo(getOverviewCamera());
  }, [animateTo, getOverviewCamera]);

  const focusPhoto = useCallback(
    (photo) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const { width, height } = viewport.getBoundingClientRect();
      const targetScale = clamp(
        Math.min(
          (width * FOCUS_PADDING) / photo.w,
          (height * FOCUS_PADDING) / photo.h,
        ),
        MIN_SCALE,
        MAX_SCALE,
      );
      const x = width / 2 - (photo.x + photo.w / 2) * targetScale;
      const y = height / 2 - (photo.y + photo.h / 2) * targetScale;

      setFocusedId(photo.id);
      animateTo({ x, y, scale: targetScale });
    },
    [animateTo],
  );

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fitOverview();
    });
    const onResize = () => {
      if (!focusedId) fitOverview();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [fitOverview, focusedId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      event.preventDefault();
      cancelAnimation();
      setHintVisible(false);
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      zoomAt(event.clientX, event.clientY, factor);
      setFocusedId(null);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [cancelAnimation, zoomAt]);

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    cancelAnimation();
    setHintVisible(false);
    movedRef.current = false;

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
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        distance: Math.hypot(dx, dy) || 1,
        scale: cameraRef.current.scale,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
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
      zoomAt(midX, midY, (pinchRef.current.scale * factor) / cameraRef.current.scale);
      setFocusedId(null);
      return;
    }

    if (!dragRef.current) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) movedRef.current = true;

    applyCamera({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
      scale: cameraRef.current.scale,
    });
    setFocusedId(null);
  };

  const endPointer = (event) => {
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
    }
  };

  const onPhotoActivate = (photo, event) => {
    event.stopPropagation();
    if (movedRef.current) return;

    if (focusedId === photo.id) {
      goOverview();
      return;
    }

    focusPhoto(photo);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') goOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOverview]);

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
          className="gallery-canvas"
          style={{
            width: CANVAS.width,
            height: CANVAS.height,
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
          }}
        >
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={`gallery-photo ${focusedId === photo.id ? 'is-focused' : ''}`}
              style={{
                left: photo.x,
                top: photo.y,
                width: photo.w,
                height: photo.h,
              }}
              onClick={(event) => onPhotoActivate(photo, event)}
              aria-label={photo.alt}
            >
              <img src={photo.src} alt={photo.alt} draggable={false} loading="lazy" />
            </button>
          ))}
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
