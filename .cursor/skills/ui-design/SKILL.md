---
name: ui-design
description: >-
  Visual and interaction design craft for product surfaces, landings, portfolios,
  and branded pages. Use when designing or critiquing UI layouts, heroes, galleries,
  typography, color, spacing, composition, or visual hierarchy; when the user asks
  for UI design, art direction, a design pass, or to make something look intentional
  rather than generic AI UI.
disable-model-invocation: false
---

# UI Design Skill

Load this skill before designing or redesigning any visual UI. Prefer judgment and restraint over decoration.

## Mandatory first read

Read [references/composition.md](references/composition.md) and [references/anti-patterns.md](references/anti-patterns.md) before proposing layouts.

For motion-led or interaction-heavy work, also load [design-engineering](../design-engineering/SKILL.md).
For phones/tablets, also load [mobile-interaction](../mobile-interaction/SKILL.md).

## Workflow

1. **Clarify the job of the first viewport** — brand, one headline, one support line, one CTA group, one dominant visual. Nothing else in the hero unless it is a dashboard.
2. **Pick one visual direction** — define CSS variables early (surface, ink, accent, gap, radius, type scale). Avoid default AI palettes (see anti-patterns).
3. **Compose with one hierarchy** — brand must survive the “remove the nav” test on branded pages.
4. **Space with intent** — generous padding is a design choice; dense packing is another. Match the product’s register (editorial = air; utility = tighter).
5. **Typography** — expressive, purposeful fonts; never Inter/Roboto/Arial/system as the hero voice unless the brand already owns them.
6. **Imagery** — real product/place/atmosphere. Decorative gradients alone are not a visual idea.
7. **Motion budget** — ship 2–3 intentional motions that create hierarchy, not noise.
8. **Self-critique** — run the checklist in [references/critique-checklist.md](references/critique-checklist.md) before calling the work done.

## Hard composition rules

- One composition in the first viewport (not a dashboard) unless it is a dashboard.
- Brand first on branded pages; no headline should overpower the brand.
- Full-bleed heroes by default on landings; no inset media cards / floating collages unless the system requires them.
- No hero overlays (badges, chips, stickers, floating labels on media).
- Default: no cards. Cards only when they are the interaction container.
- One job per section: one purpose, one headline, usually one short supporting sentence.
- Reduce clutter: no pill clusters, stat strips, icon rows, boxed promos in the first viewport.

## When existing systems exist

Preserve the established visual language. Extend tokens and patterns; do not invent a parallel aesthetic.

## Output expectations

- Name the direction in one sentence (e.g. “cool editorial light canvas, mono labels, generous gutters”).
- Define tokens before components.
- Prefer fewer stronger moves over many weak ones.
