import { photoItems } from '../data/photos';

/**
 * Top-aligned column masonry with generous outer pad + gutters.
 * All columns share the same top edge (y = pad).
 */
export function buildTopAlignedHome(settings = {}) {
  const columns = Math.max(2, Math.round(settings.gridColumns ?? 5));
  const gap = settings.gridGap ?? 72;
  const pad = settings.gridPad ?? 96;
  const colWidth = settings.columnWidth ?? 340;

  const heights = Array.from({ length: columns }, () => pad);
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
      aspect: item.aspect,
      x,
      y,
      w,
      h,
    });

    heights[col] = y + h + gap;
  }

  const contentBottom = Math.max(...heights) - gap;
  const canvas = {
    width: pad * 2 + columns * colWidth + (columns - 1) * gap,
    height: contentBottom + pad,
  };

  const byId = Object.fromEntries(photos.map((photo) => [photo.id, photo]));

  return { photos, byId, canvas };
}
