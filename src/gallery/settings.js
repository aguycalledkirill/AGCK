export const STORAGE_KEY = 'agck.gallery.settings.v1';

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

/** Factory defaults — used when nothing is saved yet, and by Reset to factory. */
export const FACTORY_DEFAULTS = {
  // Focus enlarge
  focusViewPad: 0.7,
  focusOffsetX: 0,
  focusOffsetY: 0,

  // Push / spacing
  pushGap: 36,
  overviewGap: 40,
  packPasses: 4,
  canvasClampPad: 200,

  // Motion
  flipDuration: 0.95,
  flipStagger: 0.22,
  flipEase: 'power3.inOut',
  staggerByDistance: true,

  // Camera
  minScale: 0.18,
  maxScale: 3.2,
  overviewFitX: 0.94,
  overviewFitY: 0.9,
  wheelZoomIn: 1.08,
  wheelZoomOut: 0.92,
  panBoundsPad: 0.25,
  dragThreshold: 5,

  // Appearance
  borderRadius: 0,
  hoverScale: 1.04,
  focusShadowY: 28,
  focusShadowBlur: 80,
  focusShadowOpacity: 0.28,
  showHint: true,
};

export function loadSavedDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...FACTORY_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...FACTORY_DEFAULTS, ...parsed };
  } catch {
    return { ...FACTORY_DEFAULTS };
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
      { key: 'overviewGap', label: 'Overview padding', min: 0, max: 120, step: 2 },
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
      { key: 'overviewFitX', label: 'Overview fit X', min: 0.5, max: 1, step: 0.01 },
      { key: 'overviewFitY', label: 'Overview fit Y', min: 0.5, max: 1, step: 0.01 },
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
    ],
  },
];
