export const STORAGE_KEY = 'agck.gallery.settings.v3';

export const EASING_OPTIONS = [
  'power1.inOut',
  'power2.inOut',
  'power3.inOut',
  'power4.inOut',
  'expo.inOut',
  'expo.out',
  'circ.inOut',
  'sine.inOut',
  'back.out(1.4)',
  'elastic.out(1, 0.5)',
];

/** Factory defaults — sparse 3-col photography page (reference layout). */
export const FACTORY_DEFAULTS = {
  // Home grid (top-aligned columns, generous air)
  gridColumns: 3,
  gridGap: 260,
  gridPad: 140,
  columnWidth: 380,

  // Focus enlarge
  focusViewPad: 0.72,
  focusOffsetX: 0,
  focusOffsetY: 0,

  // Push / spacing
  pushGap: 64,
  overviewGap: 48,
  packPasses: 4,
  canvasClampPad: 280,

  // Motion
  flipDuration: 0.95,
  flipStagger: 0.22,
  flipEase: 'power3.inOut',
  staggerByDistance: true,

  // Camera — fit page width, top-align (not whole tall canvas)
  minScale: 0.12,
  maxScale: 3.2,
  overviewFitX: 0.88,
  overviewTop: 100,
  wheelZoomIn: 1.08,
  wheelZoomOut: 0.92,
  panBoundsPad: 0.2,
  dragThreshold: 5,

  // Appearance
  borderRadius: 0,
  hoverScale: 1.02,
  focusShadowY: 24,
  focusShadowBlur: 64,
  focusShadowOpacity: 0.22,
  showHint: false,
  showCaptions: true,
};

/** Touch / narrow viewport overrides layered under saved defaults. */
export const MOBILE_DEFAULTS = {
  gridColumns: 2,
  gridGap: 120,
  gridPad: 40,
  columnWidth: 260,
  focusViewPad: 0.88,
  focusOffsetX: 0,
  focusOffsetY: 0,
  pushGap: 28,
  overviewGap: 28,
  overviewFitX: 0.94,
  overviewTop: 72,
  dragThreshold: 10,
  hoverScale: 1,
  focusShadowY: 16,
  focusShadowBlur: 40,
  focusShadowOpacity: 0.2,
  panBoundsPad: 0.14,
  flipDuration: 0.85,
  flipStagger: 0.16,
};

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
}

export function getDeviceDefaults() {
  return isMobileViewport()
    ? { ...FACTORY_DEFAULTS, ...MOBILE_DEFAULTS }
    : { ...FACTORY_DEFAULTS };
}

export function loadSavedDefaults() {
  const device = getDeviceDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return device;
    const parsed = JSON.parse(raw);
    return { ...device, ...parsed };
  } catch {
    return device;
  }
}

export function saveAsDefault(settings) {
  const payload = { ...FACTORY_DEFAULTS, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearSavedDefaults() {
  localStorage.removeItem(STORAGE_KEY);
}

export const SETTINGS_SECTIONS = [
  {
    id: 'grid',
    label: 'Home grid',
    fields: [
      { key: 'gridColumns', label: 'Columns', min: 2, max: 6, step: 1 },
      { key: 'gridGap', label: 'Image gap', min: 24, max: 320, step: 4 },
      { key: 'gridPad', label: 'Outer padding', min: 24, max: 240, step: 4 },
      { key: 'columnWidth', label: 'Column width', min: 180, max: 560, step: 10 },
    ],
  },
  {
    id: 'focus',
    label: 'Focus enlarge',
    fields: [
      { key: 'focusViewPad', label: 'Focus size', min: 0.35, max: 0.95, step: 0.01 },
      { key: 'focusOffsetX', label: 'Focus offset X', min: -400, max: 400, step: 4 },
      { key: 'focusOffsetY', label: 'Focus offset Y', min: -400, max: 400, step: 4 },
    ],
  },
  {
    id: 'spacing',
    label: 'Distances & push',
    fields: [
      { key: 'pushGap', label: 'Push gap', min: 0, max: 160, step: 2 },
      { key: 'overviewGap', label: 'Overview padding', min: 0, max: 160, step: 2 },
      { key: 'packPasses', label: 'Pack passes', min: 1, max: 8, step: 1 },
      { key: 'canvasClampPad', label: 'Canvas clamp pad', min: 0, max: 600, step: 10 },
    ],
  },
  {
    id: 'motion',
    label: 'Motion',
    fields: [
      { key: 'flipDuration', label: 'Duration (s)', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'flipStagger', label: 'Stagger (s)', min: 0, max: 1, step: 0.01 },
      {
        key: 'flipEase',
        label: 'Easing',
        type: 'select',
        options: EASING_OPTIONS,
      },
      {
        key: 'staggerByDistance',
        label: 'Stagger by distance',
        type: 'toggle',
      },
    ],
  },
  {
    id: 'camera',
    label: 'Camera',
    fields: [
      { key: 'minScale', label: 'Min zoom', min: 0.05, max: 1, step: 0.01 },
      { key: 'maxScale', label: 'Max zoom', min: 1, max: 6, step: 0.05 },
      { key: 'overviewFitX', label: 'Overview fit width', min: 0.5, max: 1, step: 0.01 },
      { key: 'overviewTop', label: 'Overview top inset', min: 40, max: 160, step: 2 },
      { key: 'wheelZoomIn', label: 'Wheel zoom in', min: 1.01, max: 1.25, step: 0.01 },
      { key: 'wheelZoomOut', label: 'Wheel zoom out', min: 0.75, max: 0.99, step: 0.01 },
      { key: 'panBoundsPad', label: 'Pan bounds pad', min: 0, max: 0.5, step: 0.01 },
      { key: 'dragThreshold', label: 'Drag threshold', min: 1, max: 20, step: 1 },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    fields: [
      { key: 'borderRadius', label: 'Corner radius', min: 0, max: 48, step: 1 },
      { key: 'hoverScale', label: 'Hover scale', min: 1, max: 1.2, step: 0.01 },
      { key: 'focusShadowY', label: 'Focus shadow Y', min: 0, max: 80, step: 1 },
      { key: 'focusShadowBlur', label: 'Focus shadow blur', min: 0, max: 160, step: 2 },
      { key: 'focusShadowOpacity', label: 'Focus shadow opacity', min: 0, max: 0.6, step: 0.01 },
      { key: 'showHint', label: 'Show hint', type: 'toggle' },
      { key: 'showCaptions', label: 'Show captions', type: 'toggle' },
    ],
  },
];
