export const STORAGE_KEY_DESKTOP = 'agck.gallery.settings.v4.desktop';
export const STORAGE_KEY_MOBILE = 'agck.gallery.settings.v4.mobile';
/** @deprecated migrated on read */
export const STORAGE_KEY_LEGACY = 'agck.gallery.settings.v3';

export const HINT_SEEN_KEY = 'agck.gallery.hintSeen.v1';

export const EASING_OPTIONS = [
  'agckRoam',
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

/** Keys that are device-layout specific and must not cross-contaminate. */
export const DEVICE_SCOPED_KEYS = [
  'gridColumns',
  'gridGap',
  'gridPad',
  'columnWidth',
  'focusViewPad',
  'focusCameraScale',
  'pushGap',
  'overviewGap',
  'overviewFitX',
  'overviewTop',
  'dragThreshold',
  'hoverScale',
  'panBoundsPad',
  'flipDuration',
  'flipStagger',
  'focusShadowY',
  'focusShadowBlur',
  'focusShadowOpacity',
];

/** Factory defaults — sparse 3-col photography page (reference layout). */
export const FACTORY_DEFAULTS = {
  // Home grid (top-aligned columns, generous air)
  gridColumns: 3,
  gridGap: 260,
  gridPad: 140,
  columnWidth: 380,
  layoutScatter: 0.22,

  // Focus enlarge (canonical camera scale)
  focusViewPad: 0.72,
  focusCameraScale: 1,
  focusOffsetX: 0,
  focusOffsetY: 0,
  cameraTweenDuration: 0.95,

  // Push / spacing
  pushGap: 64,
  overviewGap: 48,
  packPasses: 4,
  canvasClampPad: 120,

  // Motion
  flipDuration: 0.95,
  flipStagger: 0.22,
  flipEase: 'agckRoam',
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

  // Roam presence (composed view offset — not written into cameraRef)
  mouseFollowStrength: 36,
  mouseFollowDuration: 0.45,
  idleDriftAmp: 6,
  desktopInertia: true,
  inertiaResistance: 22,

  // Appearance
  borderRadius: 0,
  hoverScale: 1.02,
  focusShadowY: 24,
  focusShadowBlur: 64,
  focusShadowOpacity: 0.22,
  showHint: true,
  showCaptions: true,
};

/** Touch / narrow viewport overrides layered under saved defaults. */
export const MOBILE_DEFAULTS = {
  gridColumns: 2,
  gridGap: 120,
  gridPad: 40,
  columnWidth: 260,
  layoutScatter: 0.18,
  focusViewPad: 0.86,
  focusCameraScale: 1,
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
  cameraTweenDuration: 0.85,
  mouseFollowStrength: 0,
  mouseFollowDuration: 0.4,
  idleDriftAmp: 0,
  desktopInertia: false,
  inertiaResistance: 28,
};

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getStorageKey(mobile = isMobileViewport()) {
  return mobile ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP;
}

export function getDeviceDefaults() {
  return isMobileViewport()
    ? { ...FACTORY_DEFAULTS, ...MOBILE_DEFAULTS }
    : { ...FACTORY_DEFAULTS };
}

function pickDeviceScoped(parsed) {
  const out = {};
  for (const key of DEVICE_SCOPED_KEYS) {
    if (parsed[key] !== undefined) out[key] = parsed[key];
  }
  // Also allow shared appearance/motion keys from the same blob
  for (const key of Object.keys(FACTORY_DEFAULTS)) {
    if (DEVICE_SCOPED_KEYS.includes(key)) continue;
    if (parsed[key] !== undefined) out[key] = parsed[key];
  }
  return out;
}

export function loadSavedDefaults() {
  const device = getDeviceDefaults();
  try {
    const key = getStorageKey();
    let raw = localStorage.getItem(key);
    if (!raw) {
      // One-time migrate from legacy shared blob into device-scoped key
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const scoped = pickDeviceScoped(parsed);
        localStorage.setItem(key, JSON.stringify(scoped));
        raw = localStorage.getItem(key);
      }
    }
    if (!raw) return device;
    const parsed = JSON.parse(raw);
    return { ...device, ...parsed };
  } catch {
    return device;
  }
}

export function saveAsDefault(settings) {
  const device = getDeviceDefaults();
  const payload = { ...device, ...settings };
  localStorage.setItem(getStorageKey(), JSON.stringify(payload));
  return payload;
}

export function clearSavedDefaults() {
  localStorage.removeItem(getStorageKey());
}

export function hasSeenHint() {
  try {
    return localStorage.getItem(HINT_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHintSeen() {
  try {
    localStorage.setItem(HINT_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isDebugControlsEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) return true;
    return localStorage.getItem('agck.gallery.debug') === '1';
  } catch {
    return false;
  }
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
      { key: 'layoutScatter', label: 'Scatter', min: 0, max: 0.6, step: 0.02 },
    ],
  },
  {
    id: 'focus',
    label: 'Focus enlarge',
    fields: [
      { key: 'focusViewPad', label: 'Focus size', min: 0.35, max: 0.95, step: 0.01 },
      { key: 'focusCameraScale', label: 'Focus camera scale', min: 0.5, max: 2, step: 0.05 },
      { key: 'focusOffsetX', label: 'Focus offset X', min: -400, max: 400, step: 4 },
      { key: 'focusOffsetY', label: 'Focus offset Y', min: -400, max: 400, step: 4 },
      { key: 'cameraTweenDuration', label: 'Camera tween (s)', min: 0.2, max: 2.5, step: 0.05 },
    ],
  },
  {
    id: 'spacing',
    label: 'Distances & push',
    fields: [
      { key: 'pushGap', label: 'Push gap', min: 0, max: 160, step: 2 },
      { key: 'overviewGap', label: 'Overview padding', min: 0, max: 160, step: 2 },
      { key: 'packPasses', label: 'Pack passes', min: 1, max: 8, step: 1 },
      { key: 'canvasClampPad', label: 'Canvas expand pad', min: 0, max: 600, step: 10 },
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
      { key: 'mouseFollowStrength', label: 'Mouse follow', min: 0, max: 80, step: 1 },
      { key: 'mouseFollowDuration', label: 'Follow duration', min: 0.1, max: 1.2, step: 0.05 },
      { key: 'idleDriftAmp', label: 'Idle drift', min: 0, max: 24, step: 1 },
      { key: 'desktopInertia', label: 'Desktop inertia', type: 'toggle' },
      { key: 'inertiaResistance', label: 'Throw resistance', min: 8, max: 60, step: 1 },
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
