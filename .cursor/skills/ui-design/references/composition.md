# Composition & hierarchy

## First viewport budget

Usually only:

1. Brand / product name (hero-level)
2. One headline
3. One short supporting sentence
4. One CTA group
5. One dominant image or visual plane

Do **not** put in the first viewport: stats, schedules, event lists, address blocks, promos, “this week” callouts, metadata rows, secondary marketing.

## Brand test

If removing the nav makes the page feel brandless or interchangeable, branding is too weak. The product/brand name must read as a primary signal, not an eyebrow.

## Section rhythm

Each section gets:

- One purpose
- One headline
- Usually one supporting sentence
- One primary visual or interaction

Stack sections with consistent outer margin and a clear vertical beat. Alternate density carefully — don’t fill every band.

## Spacing language

Pick a base unit (4 or 8) and express padding as multiples. Name the gaps:

| Token idea | Typical use |
|---|---|
| `gap-tight` | Related controls |
| `gap-item` | Cards / images in a set |
| `gap-section` | Between major bands |
| `pad-page` | Outer frame / safe area |

**Generous** layouts (editorial galleries, brand films) use large `gap-item` and `pad-page` so negative space is part of the composition. **Utility** layouts compress `gap-item` but keep readable hit targets.

## Alignment systems

- **Top-aligned grids** — shared top edge per row or per column start; uneven bottoms are OK (masonry columns).
- **Baseline grids** — text locks to a vertical rhythm.
- **Optical alignment** — icons and type often need 1–2px optical nudge vs geometric center.

For free-roam / canvas galleries: home state should feel ordered (column tops align, consistent gutters). Focus/detail states can break order intentionally (push-away, enlarge).

## Type hierarchy

Limit to 2 families (display + mono/UI, or display + text). Scale with a clear jump between levels. Labels in mono/small-caps for tools and meta; display for brand and hero.

## Color

Define:

- `surface` / `surface-2`
- `ink` / `ink-muted`
- `accent` (one)
- `line` / hairline

One accent. Atmosphere via gradients/images/patterns — not flat single fills alone on branded surfaces.
