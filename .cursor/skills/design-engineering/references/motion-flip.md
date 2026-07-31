# GSAP Flip & layout motion

## When to use Flip

Use Flip when elements **change layout** (grid ↔ focus, reorder, filter, expand in place) and you need continuity. Do not use Flip for simple hover scales — CSS is enough.

## FLIP technique

1. **First** — `Flip.getState(targets)`
2. **Last** — change the DOM/layout (React: `flushSync` so commit finishes)
3. **Invert + Play** — `Flip.from(state, options)` animates via transforms

## Recommended options

| Option | Guidance |
|---|---|
| `absolute: true` | Usually yes during complex rearranges so flow doesn’t fight you |
| `force3D: true` | Promote layers for smoother motion |
| `nested: true` | When parent and children both Flip |
| `stagger` | Prefer distance-from-focus or `from: 'center'`; avoid pure random for “orderly” art direction |
| `ease` | `power2/3.inOut`, `expo.out` for exits; keep one family per product |

## Focus + push pattern (galleries)

1. Compute **focus rect** in world/view space (pad ~0.7 desktop / ~0.86 mobile).
2. Move focused item into that rect (size + position).
3. For overlaps: classify **N/S/E/W** by dominant axis; push on that axis only; keep the other axis.
4. Pack same-side items with a fixed gutter; cascade if a push collides with a stayer.
5. Animate all with one Flip timeline.

Random angle jitter makes home→focus feel broken unless chaos is explicit art direction.

## React pitfalls

- Calling `Flip.from` before React commits → empty/wrong animation. Use `flushSync`.
- Re-creating all nodes each frame → kills Flip identity. Stable `key`s / `data-flip-id`.
- CSS `transition` on the same properties Flip animates → fighting. Disable transitions while `.is-flipping`.
