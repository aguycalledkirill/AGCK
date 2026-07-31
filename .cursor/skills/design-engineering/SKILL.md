---
name: design-engineering
description: >-
  Implement polished UI in production code: interaction systems, motion (GSAP Flip,
  timelines), free-roam canvases, 60fps pan/zoom, layout transitions, design tokens,
  and tunable behavior controls. Use when building or refining interactive UI,
  galleries, portfolios, animation systems, performance-sensitive motion, or when
  the user mentions design engineering, Flip, GSAP, canvas pan/zoom, or interaction craft.
disable-model-invocation: false
---

# Design Engineering Skill

Bridge design intent and production code. Prefer systems that stay at ~60fps and remain tunable.

## Load with

- [ui-design](../ui-design/SKILL.md) for visual direction
- [mobile-interaction](../mobile-interaction/SKILL.md) when touch is in scope
- [references/motion-flip.md](references/motion-flip.md) for layout transitions
- [references/perf-60fps.md](references/perf-60fps.md) before shipping motion
- [references/behavior-controls.md](references/behavior-controls.md) when exposing design knobs

## Core stance

1. **Encode the design as parameters** — gaps, pads, focus size, easing, duration live in one settings object with factory defaults + optional “save as default”.
2. **Separate home layout from focus layout** — home should feel ordered; focus may deliberately break order (enlarge + push neighbors).
3. **Animate on the compositor** — prefer `transform` / opacity; use FLIP for layout changes instead of tweening `top`/`width` every frame by hand.
4. **Don’t React-render every pointer frame** — drive continuous camera/gesture state via refs + `requestAnimationFrame` / GSAP ticker.
5. **Design for the device** — hover and wheel are not universal; pair with tap and pinch.

## Implementation workflow

1. Extract tokens + behavior defaults (`settings.js` / CSS variables).
2. Implement **home layout algorithm** (e.g. top-aligned column masonry with generous gap/pad).
3. Implement **interaction camera** (pan, zoom-to-cursor, pinch) without per-frame React state.
4. Implement **focus transition** with GSAP Flip: `getState` → mutate layout (`flushSync` in React) → `Flip.from({ absolute, force3D })`.
5. Push overlapping items **deterministically** (cardinal N/S/E/W + packing), not pure random, unless chaos is the art direction.
6. Add a **Controls** surface for live tuning; persist with `localStorage` when asked.
7. Verify 60fps path and mobile translation before done.

## React + GSAP Flip recipe

```js
const state = Flip.getState(nodes);
flushSync(() => applyNewLayout());
Flip.from(state, {
  absolute: true,
  force3D: true,
  duration,
  ease,
  stagger: { amount, from: 'center' }, // or distance-ordered fn
});
```

Lock ticker when needed: `gsap.ticker.fps(60)`.

## Camera / canvas recipe

- Store `{ x, y, scale }` in a ref.
- Paint with `el.style.transform = translate3d(...) scale(...)`.
- Coalesce paints with a single rAF.
- Zoom toward pointer: keep world point under cursor fixed.
- Cache viewport metrics; don’t `getBoundingClientRect` every move.

## Quality bar

- Home state: ordered, generous or dense **on purpose**, consistent gutters.
- Focus state: readable focal image, neighbors clear the focus rect orderly.
- Controls: do not block the composition permanently; mobile = bottom sheet.
- Reduced motion: disable non-essential transitions.
