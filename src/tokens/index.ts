export const Colors = {
  lime:    '#C8FF00',
  limeD:   '#8fb300',
  bg:      '#0A0A0A',
  surface: '#121212',
  card:    '#181818',
  border:  '#242424',
  text:    '#F2F2F2',
  muted:   '#666666',
  dim:     '#333333',
  red:     '#FF4040',
  orange:  '#FF8C00',
  blue:    '#4C9EFF',
} as const;

export const FontFamily = {
  display: 'Georgia',
  mono:    'Courier New',
  body:    'System',          // maps to San Francisco on iOS, Roboto on Android
} as const;

export const Radius = {
  sm:  6,
  md:  8,
  lg:  12,
  xl:  16,
  pill: 999,
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;
