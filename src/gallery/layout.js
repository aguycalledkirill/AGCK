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

function pushClearOf(home, focusRect, settings, canvas) {
  const side = dominantSide(home, focusRect);
  const gap = settings.pushGap;
  const pad = settings.canvasClampPad;
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
    x: clamp(x, -pad, canvas.width - home.w + pad),
    y: clamp(y, -pad, canvas.height - home.h + pad),
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
      pushedById.set(id, pushClearOf(base, focusRect, settings, canvas));
    } else {
      next[id] = { ...base };
    }
  }

  let grew = true;
  while (grew) {
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
        pushedById.set(id, pushClearOf(homes[id], focusRect, settings, canvas));
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

  return next;
}

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
    x: viewLeft + (viewW - focusW) / 2 + settings.focusOffsetX,
    y: viewTop + (viewH - focusH) / 2 + settings.focusOffsetY,
    w: focusW,
    h: focusH,
  };
}

export { clamp, rectsOverlap };
