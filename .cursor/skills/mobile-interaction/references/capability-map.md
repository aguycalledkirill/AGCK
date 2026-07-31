# Desktop → mobile capability map

| Desktop | Mobile translation | Notes |
|---|---|---|
| Drag to pan | One-finger pan | Raise drag threshold so taps still register |
| Wheel zoom | Pinch zoom | Hint copy must say Pinch; optional +/- buttons if pinch discoverability fails |
| Click to focus | Tap to focus | Larger focusViewPad (~0.85–0.9) |
| Hover scale | None / press opacity | Disable hover scale on coarse pointers |
| Escape to overview | Overview control + tap focused again | Always visible chrome |
| Side settings panel | Bottom sheet + accordion | Safe-area bottom; sticky Set as default |
| Dense 5–6 col grid | 3 col (or 2) + still-generous gap | Rebuild home layout from mobile defaults |
| Cursor zoom-toward-point | Pinch midpoint zoom | Same world-point math |
| Keyboard shortcuts | On-screen actions | Don’t hide critical actions behind keys only |
| Large soft shadows on many tiles | Reduce while dragging | Perf on mid Android |

## What will not work (do not ship as-is)

- Hover-only tooltips as the only label
- Wheel-only zoom with no pinch
- Tiny overview thumbnails that are untappable without zoom (start closer or fewer columns)
- Desktop hint strings on touch devices
- Full-height side panels covering half a phone without sheet semantics

## Inertia

Short flick inertia on pan feels native on mobile; keep decay fast (~200–350ms effective) so it doesn’t steal the next tap. Disable or shorten on desktop mouse drag.
