# Behavior controls (design parameters as product)

Expose the design system of motion/layout as live controls when the work is exploratory or client-tunable (galleries, brand sites, motion R&D).

## Settings model

```js
FACTORY_DEFAULTS = { gridGap, gridPad, focusViewPad, pushGap, flipDuration, flipEase, ... }
MOBILE_DEFAULTS = { ... } // layered for coarse / narrow viewports
loadSavedDefaults() // localStorage merge
saveAsDefault(current)
```

Bump storage key version when defaults materially change so stale saves don’t fight new art direction.

## Control surface UX

- Desktop: side panel.
- Mobile: **bottom sheet** + accordion sections + safe-area padding.
- Always include: **Set as default**, **Load default**, **Factory reset**.
- Sticky primary actions on small screens.
- Don’t let the panel steal canvas gestures (`pointer` isolation / backdrop dismiss).

## What to expose

| Cluster | Examples |
|---|---|
| Home grid | columns, gap, outer pad, column width |
| Focus | size pad, offset X/Y |
| Push | push gap, pack passes |
| Motion | duration, stagger, easing, stagger-by-distance |
| Camera | min/max zoom, wheel factors, drag threshold |
| Appearance | radius, hover scale, focus shadow |

## Engineering rule

Changing grid parameters should **rebuild home layout** (and Flip animate if not focused). Changing focus/push params applies on next focus.
