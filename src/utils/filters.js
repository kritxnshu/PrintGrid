/**
 * Filter presets for per-image photo filters.
 * Each preset defines adjustments to brightness, contrast, saturation, and hue.
 */

export const FILTER_PRESETS = [
  {
    key: 'none',
    label: 'None',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
  },
  {
    key: 'vivid',
    label: 'Vivid',
    brightness: 0.05,
    contrast: 0.15,
    saturation: 0.35,
    hue: 0,
  },
  {
    key: 'warm',
    label: 'Warm',
    brightness: 0.06,
    contrast: 0.05,
    saturation: 0.1,
    hue: 15,
  },
  {
    key: 'cool',
    label: 'Cool',
    brightness: 0,
    contrast: 0.05,
    saturation: -0.05,
    hue: -20,
  },
  {
    key: 'bw',
    label: 'B&W',
    brightness: 0.03,
    contrast: 0.12,
    saturation: -1,
    hue: 0,
  },
  {
    key: 'sepia',
    label: 'Sepia',
    brightness: 0.05,
    contrast: -0.05,
    saturation: -0.6,
    hue: 25,
  },
  {
    key: 'vintage',
    label: 'Vintage',
    brightness: 0.08,
    contrast: -0.1,
    saturation: -0.3,
    hue: 10,
  },
  {
    key: 'dramatic',
    label: 'Dramatic',
    brightness: -0.08,
    contrast: 0.35,
    saturation: -0.15,
    hue: 0,
  },
  {
    key: 'fade',
    label: 'Fade',
    brightness: 0.12,
    contrast: -0.2,
    saturation: -0.25,
    hue: 5,
  },
];

/**
 * Apply a filter preset to get final brightness/contrast/saturation/hue values.
 * Merges preset values with any existing manual adjustments.
 */
export const applyFilterPreset = (presetKey, manualAdjustments = {}) => {
  const preset = FILTER_PRESETS.find((p) => p.key === presetKey) ?? FILTER_PRESETS[0];

  return {
    brightness: (manualAdjustments.brightness ?? 0) + preset.brightness,
    contrast: (manualAdjustments.contrast ?? 0) + preset.contrast,
    saturation: preset.saturation,
    hue: preset.hue,
  };
};

export const getFilterPreset = (key) =>
  FILTER_PRESETS.find((p) => p.key === key) ?? FILTER_PRESETS[0];
