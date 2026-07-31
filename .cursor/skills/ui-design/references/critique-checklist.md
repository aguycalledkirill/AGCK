# Pre-ship critique checklist

Run mentally or aloud before finishing a UI pass:

1. **Brand test** — Without nav, is the brand still obvious?
2. **Hero budget** — Only brand, headline, support, CTA, one visual?
3. **One job** — Does each section do one thing?
4. **Cards** — If I remove border/shadow/radius, does anything break? If not, remove them.
5. **Type** — Is the display face intentional (not Inter/system default)?
6. **Atmosphere** — Is there a real visual anchor (image/place/product), not only a flat fill?
7. **Spacing** — Are gutters consistent? Does “generous” actually read generous at the default zoom/viewport?
8. **Motion** — Are there 2–3 purposeful motions, and do they survive `prefers-reduced-motion`?
9. **Mobile** — Do hover-only and wheel-only cues have touch equivalents?
10. **Performance** — Will pan/zoom/Flip stay on the compositor (transforms), targeting ~60fps?
