import { photoItems } from '../data/photos';

const CAPTION_SPACE = 28;

/** Deterministic 0..1 hash from string id + salt. */
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Sparse top-aligned column masonry with optional seeded scatter.
 * Generous gutters; captions reserved under each image.
 */
export function buildTopAlignedHome(settings = {}) {
  const columns = Math.max(2, Math.round(settings.gridColumns ?? 3));
  const gap = settings.gridGap ?? 200;
  const pad = settings.gridPad ?? 120;
  const colWidth = settings.columnWidth ?? 400;
  const captionSpace = settings.showCaptions === false ? 0 : CAPTION_SPACE;
  const scatter = Math.max(0, Math.min(0.8, settings.layoutScatter ?? 0));

  const colStagger =
    columns === 3
      ? [0, gap * 0.45, gap * 0.18]
      : columns === 2
        ? [0, gap * 0.28]
        : Array.from({ length: columns }, () => 0);
  const heights = Array.from({ length: columns }, (_, i) => pad + (colStagger[i] ?? 0));
  const photos = [];

  for (const item of photoItems) {
    let col = 0;
    for (let i = 1; i < columns; i += 1) {
      if (heights[i] < heights[col]) col = i;
    }

    const w = colWidth;
    const h = Math.round(w / item.aspect);
    const baseX = pad + col * (colWidth + gap);
    const baseY = heights[col];

    const jx = (hash01(`${item.id}:x`) - 0.5) * 2 * gap * scatter * 0.35;
    const jy = hash01(`${item.id}:y`) * gap * scatter * 0.55;

    const x = baseX + jx;
    const y = baseY + jy;

    photos.push({
      id: item.id,
      src: item.src,
      srcFocus: item.srcFocus ?? item.src,
      alt: item.alt,
      caption: item.caption ?? '',
      title: item.title ?? item.alt,
      aspect: item.aspect,
      x,
      y,
      w,
      h,
    });

    heights[col] = y + h + captionSpace + gap;
  }

  const contentBottom = Math.max(...heights) - gap + 8;
  const footerReserve = 160;
  const canvas = {
    width: pad * 2 + columns * colWidth + (columns - 1) * gap + gap * scatter,
    height: contentBottom + pad + footerReserve,
  };

  const byId = Object.fromEntries(photos.map((photo) => [photo.id, photo]));
  const footerY = contentBottom + Math.round(pad * 0.35);

  return { photos, byId, canvas, footerY };
}
