# 60fps interaction path

## Budget

Target **~16.7ms** per frame. Continuous gestures (pan/zoom) must not trigger React render or layout thrash every event.

## Do

- Update transforms on the DOM node directly (or GSAP quickTo / ticker).
- One rAF paint scheduled per frame max for camera.
- `will-change: transform` on the moving canvas only while useful.
- `contain: layout style` where it helps isolate work.
- `translateZ(0)` / `force3D` for layers that move.
- Disable CSS transitions during drag/flip.
- Cache viewport size; refresh on resize / gesture start.
- `gsap.ticker.fps(60)` + mild lagSmoothing for Flip timelines.
- `content-visibility: auto` carefully for offscreen tiles (test for flicker).

## Don’t

- `setState` on every `pointermove` / `wheel` for camera.
- Animate `top`/`left`/`width`/`height` every frame manually (use Flip once per layout change).
- `getBoundingClientRect` in tight loops.
- Heavy `box-shadow` / `backdrop-filter` on dozens of moving nodes during pan (freeze effects while dragging if needed).
- Decode huge images at full res for thumbnails — size Unsplash/CDN URLs to need.

## Gesture notes

- **Pan** — track velocity; optional short inertia on coarse pointers only.
- **Zoom** — zoom toward cursor/pinch midpoint; clamp min/max scale.
- **Tap vs drag** — higher `dragThreshold` on touch (~8–12px) so taps still focus.

## Verify

Playwright / device: pan hard, pinch, focus Flip. Watch for dropped frames and layout shifts. Prefer production build for timing checks.
