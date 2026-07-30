---
name: mobile-interaction
description: >-
  Translate desktop UI and canvas interactions to phones and tablets. Use when
  building responsive or mobile versions, auditing touch UX, replacing hover/wheel
  affordances, adding safe areas, pinch/pan/tap, mobile controls sheets, or when
  the user mentions mobile, touch, iOS, Android, or coarse pointer.
disable-model-invocation: false
---

# Mobile Interaction Skill

Desktop patterns do not map 1:1. Translate capability; drop or replace what cannot work.

## Always load

[references/capability-map.md](references/capability-map.md) before implementing a mobile pass.

Also load [ui-design](../ui-design/SKILL.md) and [design-engineering](../design-engineering/SKILL.md) when changing layout or motion.

## Workflow

1. **Inventory desktop behaviors** — pan, zoom, click, hover, keyboard, dense panels.
2. **Map each** to touch equivalent, remove, or redesign (see capability map).
3. **Apply a mobile defaults profile** — larger focus pad, higher drag threshold, fewer columns, no hover scale.
4. **Fix copy** — “Pinch to zoom”, “Tap a photo”; never leave “Scroll to zoom” as the only cue.
5. **Chrome** — `viewport-fit=cover`, `env(safe-area-inset-*)`, 44px min hit targets.
6. **Controls** — bottom sheet + accordion; backdrop dismiss.
7. **Verify** on a real narrow viewport (390×844) with tap, pan, pinch, focus, overview.

## Defaults worth encoding

```js
MOBILE_DEFAULTS ≈ {
  focusViewPad: 0.86,
  dragThreshold: 10,
  hoverScale: 1,
  gridColumns: 3,
  gridGap: /* still generous */,
  flipDuration: slightly shorter,
}
```

Detect with `(max-width: 720px), (pointer: coarse)`.

## Non-negotiables

- Provide a visible way out of focus (Overview / tap again) — Escape is not enough.
- Pinch must work if zoom matters; document it in the hint.
- Don’t rely on hover for critical discovery.
- Keep canvas `touch-action: none` when you own gestures; prevent iOS rubber-band fights.
