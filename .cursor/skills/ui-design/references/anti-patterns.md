# UI anti-patterns (avoid by default)

## Look-alikes AI defaults to — ban unless brand requires

1. Purple-on-white or purple→indigo gradient themes
2. Warm cream (~`#F4F1EA`) + high-contrast serif display + terracotta accent
3. Broadsheet: hairline rules, zero radius, dense newspaper columns

Also avoid as defaults: dark mode for its own sake, purple glow, rounded-full pill clusters, multi-layer shadows, emoji decoration.

## Structure anti-patterns

- First viewport that could belong to any brand after removing nav
- Inset hero images / side-panel heroes / floating media cards on landings
- Cards everywhere (borders + shadows + radius with no interaction need)
- Hero overlays: badges, chips, stickers, callouts on media
- Stat strips, icon rows, schedule snippets fighting the hero
- Multiple competing text blocks in one section

## Type anti-patterns

- Inter / Roboto / Arial / system as the expressive voice
- Tiny gray body text on busy backgrounds
- All-caps paragraphs

## Motion anti-patterns

- Animating everything
- Layout thrash (`top`/`left`/`width`/`height` every frame) instead of transforms
- Hover-only affordances as the only way to discover actions on touch devices

## Gallery / canvas anti-patterns

- Random scatter that reads as broken layout for the **default/home** state
- Desktop copy on mobile (“Scroll to zoom” when pinch is required)
- Controls chrome that covers the composition without a clear dismiss path
