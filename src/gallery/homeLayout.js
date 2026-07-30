import { photoItems } from '../data/photos';

const CAPTION_SPACE = 28;

/**
 * Sparse top-aligned column masonry (reference photography page).
 * Generous gutters; captions reserved under each image.
 */
export function buildTopAlignedHome(settings = {}) {
  const columns = Math.max(2, Math.round(settings.gridColumns ?? 3));
  const gap = settings.gridGap ?? 200;
  const pad = settings.gridPad ?? 120;
  const colWidth = settings.columnWidth ?? 400;
  const captionSpace = settings.showCaptions === false ? 0 : CAPTION_SPACE;

  // Slight per-column top stagger so rows feel curated, not rigid.
  const colStagger = columns === 3 ? [0, gap * 0.35, gap * 0.12] : Array.from({ length: columns }, () => 0);
  const heights = Array.from({ length: columns }, (_, i) => pad + (colStagger[i] ?? 0));
  const photos = [];

  for (const item of photoItems) {
    let col = 0;
    for (let i = 1; i < columns; i += 1) {
      if (heights[i] < heights[col]) col = i;
    }

    const w = colWidth;
    const h = Math.round(w / item.aspect);
    const x = pad + col * (colWidth + gap);
    const y = heights[col];

    photos.push({
      id: item.id,
      src: item.src,
      alt: item.alt,
      caption: item.caption ?? '',
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
    width: pad * 2 + columns * colWidth + (columns - 1) * gap,
    height: contentBottom + pad + footerReserve,
  };

  const byId = Object.fromEntries(photos.map((photo) => [photo.id, photo]));
  const footerY = contentBottom + Math.round(pad * 0.35);

  return { photos, byId, canvas, footerY };
}
