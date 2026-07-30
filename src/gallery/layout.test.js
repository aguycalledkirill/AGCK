import { describe, expect, it } from 'vitest';
import {
  buildFocusLayouts,
  computeCanonicalFocus,
  countFocusOverlaps,
  rectsOverlap,
} from './layout.js';
import { buildTopAlignedHome } from './homeLayout.js';
import { FACTORY_DEFAULTS, MOBILE_DEFAULTS } from './settings.js';

function homesFromBoot(boot) {
  return Object.fromEntries(boot.photos.map((p) => [p.id, { ...p }]));
}

describe('buildFocusLayouts', () => {
  it('clears neighbors of focus on desktop factory defaults', () => {
    const cfg = { ...FACTORY_DEFAULTS };
    const boot = buildTopAlignedHome(cfg);
    const homes = homesFromBoot(boot);
    const viewport = { width: 1440, height: 900 };
    const { focusRect } = computeCanonicalFocus(homes.p1, viewport, cfg);

    const { layouts, canvas } = buildFocusLayouts(
      'p1',
      focusRect,
      homes,
      homes,
      cfg,
      boot.canvas,
    );

    expect(canvas.width).toBeGreaterThanOrEqual(boot.canvas.width);
    expect(countFocusOverlaps(layouts, 'p1', layouts.p1, cfg.pushGap)).toBe(0);
    expect(layouts.p1.w).toBeCloseTo(focusRect.w, 0);
  });

  it('clears neighbors of focus on mobile defaults / narrow viewport', () => {
    const cfg = { ...FACTORY_DEFAULTS, ...MOBILE_DEFAULTS };
    const boot = buildTopAlignedHome(cfg);
    const homes = homesFromBoot(boot);
    const viewport = { width: 390, height: 844 };

    for (const id of ['p1', 'p3', 'p10', 'p13', 'p24']) {
      if (!homes[id]) continue;
      const { focusRect } = computeCanonicalFocus(homes[id], viewport, cfg);
      const { layouts } = buildFocusLayouts(
        id,
        focusRect,
        homes,
        homes,
        cfg,
        boot.canvas,
      );
      expect(
        countFocusOverlaps(layouts, id, layouts[id], cfg.pushGap),
        `overlaps for ${id}`,
      ).toBe(0);
    }
  });

  it('does not leave pushed cards overlapping each other after pack', () => {
    const cfg = { ...FACTORY_DEFAULTS, ...MOBILE_DEFAULTS, pushGap: 24 };
    const boot = buildTopAlignedHome(cfg);
    const homes = homesFromBoot(boot);
    const viewport = { width: 390, height: 844 };
    const { focusRect } = computeCanonicalFocus(homes.p1, viewport, cfg);
    const { layouts } = buildFocusLayouts(
      'p1',
      focusRect,
      homes,
      homes,
      cfg,
      boot.canvas,
    );

    const ids = Object.keys(layouts).filter((id) => id !== 'p1');
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        expect(rectsOverlap(layouts[ids[i]], layouts[ids[j]], 0)).toBe(false);
      }
    }
  });
});

describe('computeCanonicalFocus', () => {
  it('produces focus size independent of current roam camera', () => {
    const cfg = { ...FACTORY_DEFAULTS, focusCameraScale: 1 };
    const home = { id: 'p1', x: 100, y: 200, w: 300, h: 400 };
    const viewport = { width: 1200, height: 800 };
    const a = computeCanonicalFocus(home, viewport, cfg);
    const b = computeCanonicalFocus(home, viewport, cfg);
    expect(a.focusRect.w).toBeCloseTo(b.focusRect.w, 5);
    expect(a.camera.scale).toBe(1);
    expect(a.focusRect.w).toBeLessThanOrEqual(viewport.width * cfg.focusViewPad + 1);
  });
});
