function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a, b, pad = 0) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function dominantSide(home, focusRect) {
  const cardCx = home.x + home.w / 2;
  const cardCy = home.y + home.h / 2;
  const focusCx = focusRect.x + focusRect.w / 2;
  const focusCy = focusRect.y + focusRect.h / 2;
  const dx = cardCx - focusCx;
  const dy = cardCy - focusCy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}

/** Push clear of focus on a cardinal axis — no canvas clamp (avoids forcing overlaps). */
function pushClearOf(home, focusRect, settings) {
  const side = dominantSide(home, focusRect);
  const gap = settings.pushGap;
  let x = home.x;
  let y = home.y;

  if (side === 'east') {
    x = focusRect.x + focusRect.w + gap;
  } else if (side === 'west') {
    x = focusRect.x - home.w - gap;
  } else if (side === 'south') {
    y = focusRect.y + focusRect.h + gap;
  } else {
    y = focusRect.y - home.h - gap;
  }

  return {
    id: home.id,
    side,
    x,
    y,
    w: home.w,
    h: home.h,
  };
}

function packSameSide(pushed, settings) {
  const gap = settings.pushGap;
  const bySide = { north: [], south: [], east: [], west: [] };
  for (const card of pushed) {
    bySide[card.side].push({ ...card });
  }

  for (const side of Object.keys(bySide)) {
    const group = bySide[side];
    if (group.length < 2) continue;

    if (side === 'north' || side === 'south') {
      group.sort((a, b) => a.x - b.x);
      for (let i = 1; i < group.length; i += 1) {
        const prev = group[i - 1];
        const minX = prev.x + prev.w + gap;
        if (group[i].x < minX) group[i].x = minX;
      }
      for (let i = 1; i < group.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          if (!rectsOverlap(group[i], group[j])) continue;
          if (side === 'south') {
            group[i].y = Math.max(group[i].y, group[j].y + group[j].h + gap);
          } else {
            group[i].y = Math.min(group[i].y, group[j].y - group[i].h - gap);
          }
        }
      }
    } else {
      group.sort((a, b) => a.y - b.y);
      for (let i = 1; i < group.length; i += 1) {
        const prev = group[i - 1];
        const minY = prev.y + prev.h + gap;
        if (group[i].y < minY) group[i].y = minY;
      }
      for (let i = 1; i < group.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          if (!rectsOverlap(group[i], group[j])) continue;
          if (side === 'east') {
            group[i].x = Math.max(group[i].x, group[j].x + group[j].w + gap);
          } else {
            group[i].x = Math.min(group[i].x, group[j].x - group[i].w - gap);
          }
        }
      }
    }
  }

  const packed = [
    ...bySide.north,
    ...bySide.south,
    ...bySide.east,
    ...bySide.west,
  ];

  const passes = Math.max(1, Math.round(settings.packPasses));
  for (let pass = 0; pass < passes; pass += 1) {
    for (let i = 0; i < packed.length; i += 1) {
      for (let j = i + 1; j < packed.length; j += 1) {
        const a = packed[i];
        const b = packed[j];
        if (!rectsOverlap(a, b, 0)) continue;

        if (b.side === 'east') {
          b.x = Math.max(b.x, a.x + a.w + gap);
        } else if (b.side === 'west') {
          b.x = Math.min(b.x, a.x - b.w - gap);
        } else if (b.side === 'south') {
          b.y = Math.max(b.y, a.y + a.h + gap);
        } else {
          b.y = Math.min(b.y, a.y - b.h - gap);
        }
      }
    }
  }

  return packed;
}

/**
 * Expand canvas so all layouts fit. Shifts layouts into positive space if needed.
 * Mutates `layouts` in place when an origin shift is required.
 */
export function expandCanvasToFit(layouts, baseCanvas, pad = 80) {
  const items = Object.values(layouts);
  if (!items.length) {
    return { width: baseCanvas.width, height: baseCanvas.height, originShift: { x: 0, y: 0 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }

  const ox = minX < pad ? pad - minX : 0;
  const oy = minY < pad ? pad - minY : 0;

  if (ox || oy) {
    for (const id of Object.keys(layouts)) {
      const item = layouts[id];
      layouts[id] = { ...item, x: item.x + ox, y: item.y + oy };
    }
    maxX += ox;
    maxY += oy;
  }

  return {
    width: Math.max(baseCanvas.width + ox, Math.ceil(maxX + pad)),
    height: Math.max(baseCanvas.height + oy, Math.ceil(maxY + pad)),
    originShift: { x: ox, y: oy },
  };
}

/**
 * Build focus layouts. Returns { layouts, canvas }.
 * Canvas may grow so pushed cards never need to be clamped into the focus rect.
 */
export function buildFocusLayouts(photoId, focusRect, homes, currents, settings, canvas) {
  const gap = settings.pushGap;
  const next = {};
  const pushedById = new Map();
  const ids = Object.keys(homes);

  for (const id of ids) {
    const base = homes[id];
    if (id === photoId) {
      next[id] = { ...base, ...focusRect };
      continue;
    }

    const current = currents[id] ?? base;
    if (rectsOverlap(current, focusRect, gap) || rectsOverlap(base, focusRect, gap)) {
      pushedById.set(id, pushClearOf(base, focusRect, settings));
    } else {
      next[id] = { ...base };
    }
  }

  let grew = true;
  let guard = 0;
  while (grew && guard < ids.length + 2) {
    guard += 1;
    grew = false;
    const packed = packSameSide([...pushedById.values()], settings);
    pushedById.clear();
    for (const card of packed) {
      pushedById.set(card.id, card);
    }

    for (const id of ids) {
      if (id === photoId || pushedById.has(id)) continue;
      const staying = next[id];
      if (!staying) continue;

      let hits = rectsOverlap(staying, focusRect, gap);
      if (!hits) {
        for (const card of pushedById.values()) {
          if (rectsOverlap(staying, card, gap)) {
            hits = true;
            break;
          }
        }
      }

      if (hits) {
        pushedById.set(id, pushClearOf(homes[id], focusRect, settings));
        delete next[id];
        grew = true;
      }
    }
  }

  for (const card of packSameSide([...pushedById.values()], settings)) {
    next[card.id] = {
      id: card.id,
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.h,
    };
  }

  // Final hard clear vs focus (pack can still leave edge cases on tiny gaps).
  for (const id of ids) {
    if (id === photoId) continue;
    const card = next[id];
    if (!card) continue;
    if (!rectsOverlap(card, focusRect, gap)) continue;
    const cleared = pushClearOf(
      { ...homes[id], x: card.x, y: card.y, w: card.w, h: card.h },
      focusRect,
      settings,
    );
    next[id] = {
      id: cleared.id,
      x: cleared.x,
      y: cleared.y,
      w: cleared.w,
      h: cleared.h,
    };
  }

  const expanded = expandCanvasToFit(next, canvas, settings.canvasClampPad ?? 80);

  return {
    layouts: next,
    canvas: { width: expanded.width, height: expanded.height },
    originShift: expanded.originShift,
  };
}

/** Legacy helper: focus rect in current camera view space (zoom-dependent). */
export function computeFocusRect(home, viewportSize, camera, settings) {
  const { width, height } = viewportSize;
  const viewW = width / camera.scale;
  const viewH = height / camera.scale;
  const viewLeft = -camera.x / camera.scale;
  const viewTop = -camera.y / camera.scale;
  const aspect = home.w / home.h;
  const pad = settings.focusViewPad;

  let focusW = viewW * pad;
  let focusH = focusW / aspect;
  if (focusH > viewH * pad) {
    focusH = viewH * pad;
    focusW = focusH * aspect;
  }

  return {
    x: viewLeft + (viewW - focusW) / 2 + (settings.focusOffsetX || 0),
    y: viewTop + (viewH - focusH) / 2 + (settings.focusOffsetY || 0),
    w: focusW,
    h: focusH,
  };
}

/**
 * Canonical focus framing: size/camera independent of current roam zoom.
 * Anchors the focus rect on the photo's home center so push distances stay local.
 */
export function computeCanonicalFocus(home, viewportSize, settings) {
  const scale = clamp(
    settings.focusCameraScale ?? 1,
    settings.minScale ?? 0.1,
    settings.maxScale ?? 4,
  );
  const pad = settings.focusViewPad ?? 0.72;
  const viewW = viewportSize.width / scale;
  const viewH = viewportSize.height / scale;
  const aspect = home.w / home.h;

  let focusW = viewW * pad;
  let focusH = focusW / aspect;
  if (focusH > viewH * pad) {
    focusH = viewH * pad;
    focusW = focusH * aspect;
  }

  const homeCx = home.x + home.w / 2;
  const homeCy = home.y + home.h / 2;
  const focusRect = {
    x: homeCx - focusW / 2 + (settings.focusOffsetX || 0),
    y: homeCy - focusH / 2 + (settings.focusOffsetY || 0),
    w: focusW,
    h: focusH,
  };

  const camera = {
    scale,
    x: viewportSize.width / 2 - (focusRect.x + focusRect.w / 2) * scale,
    y: viewportSize.height / 2 - (focusRect.y + focusRect.h / 2) * scale,
  };

  return { focusRect, camera };
}

export function countFocusOverlaps(layouts, photoId, focusRect, gap) {
  let count = 0;
  for (const [id, layout] of Object.entries(layouts)) {
    if (id === photoId) continue;
    if (rectsOverlap(layout, focusRect, gap)) count += 1;
  }
  return count;
}

export { clamp, rectsOverlap };
