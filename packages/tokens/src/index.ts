/**
 * Ekagra design tokens shared by every active client.
 *
 * The legacy dark-ember roles remain exported for existing consumers. The
 * Warm Planning Desk II roles below are the active design-law surface.
 * This package deliberately has no web, React, or platform dependency.
 */

/** Legacy v1 color roles retained until their consumers are removed. */
export const color = {
  bgDeep: '#07080A',
  bg: '#0E0F12',
  bgFocus: '#0A0B0E',
  surface: '#16181D',
  surface2: '#111318',
  surface3: '#1B1E24',
  line: '#23262E',
  lineSoft: '#1D2028',
  lineHi: '#3A3F49',
  trackHairline: '#1A1D23',
  t1: '#ECEDEF',
  t2: '#B9BDC4',
  t3: '#8A8F98',
  t4: '#6B7078',
  t5: '#41454D',
  ember: '#F08A3E',
  emberHi: '#FFB25E',
  emberDim: '#7C5638',
  green: '#5BBF8A',
  danger: '#E4796B',
  dangerDim: '#3A2320',
  goalMauve: '#C48FBF',
  goalBlue: '#7C9BC4',
  goalTan: '#B7A46B',
  emberWash: 'rgba(240,138,62,0.10)',
  emberLine: 'rgba(240,138,62,0.45)',
  greenWash: 'rgba(91,191,138,0.12)',
  greenLine: 'rgba(91,191,138,0.40)',
} as const;

/** Returns a hex color at the given alpha as an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = Number.parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Retained until the final goal-color consumer is removed. */
export const goalPalette = [color.goalMauve, color.goalBlue, color.green, color.goalTan] as const;

/** Warm Planning Desk II semantic colors, with the exact DESIGN.md core roles. */
export const light = {
  bg: '#FBF7F0',
  surface: '#F3EDE2',
  ink: '#2B2621',
  accent: '#6753C7',
  success: '#3F7D58',
  danger: '#B3492E',
  textSecondary: '#6D6258',
  line: '#DFD5C6',
  track: '#E2D8C9',
  onAccent: '#FBF7F0',
  dangerSurface: '#F5DED5',
  successSurface: '#DDEBDD',

  // Compatibility names used by the shipped v2 mobile surface.
  canvas: '#FBF7F0',
  canvasDeep: '#EFE9DD',
  surfaceSunk: '#E2D8C9',
  navBar: '#F3EDE2',
  inkOnDark: '#FBF7F0',
  textMetaDecorative: '#8A7C6C',
  textPlaceholder: '#A4977F',
  lineSoft: '#DFD5C6',
  lineInput: '#DFD5C6',
  lineStrong: '#C9BDA8',
  accentPressed: '#52409F',
  accentOnDark: '#8F7CE8',
  dangerBg: '#F5DED5',
  dangerLine: '#DCB2A4',
  dangerText: '#5D2B1C',
  snackbarBg: '#2A2119',
  priHigh: '#2B2621',
  priMid: '#A4977F',
} as const;

export const dark = {
  bg: '#1E1B17',
  surface: '#2A2520',
  ink: '#F1EAE0',
  accent: '#8F7CE8',
  success: '#6FBF8B',
  danger: '#E38266',
  textSecondary: '#C4B8AB',
  line: '#4B433B',
  track: '#3A332C',
  onAccent: '#1E1B17',
  dangerSurface: '#3B2923',
  successSurface: '#223229',

  // Compatibility names used by the shipped v2 mobile surface.
  canvas: '#1E1B17',
  canvasDeep: '#141009',
  surfaceSunk: '#3A332C',
  navBar: '#2A2520',
  inkOnDark: '#1E1B17',
  textMetaDecorative: '#8A7C6C',
  textPlaceholder: '#6F6355',
  lineSoft: '#4B433B',
  lineInput: '#4B433B',
  lineStrong: '#4B433B',
  accentPressed: '#6753C7',
  accentOnDark: '#C3B6F5',
  dangerBg: '#3B2923',
  dangerLine: '#5D2B1C',
  dangerText: '#E38266',
  snackbarBg: '#2A2119',
  priHigh: '#F1EAE0',
  priMid: '#A4977F',
} as const;

export type ThemeColors = { readonly [K in keyof typeof light]: string };
export const themes = { light, dark } satisfies Record<string, ThemeColors>;
export type ThemeName = keyof typeof themes;

export const font = {
  family: "'Instrument Sans', system-ui, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800 },
} as const;

/** Existing v2 family export retained as an alias-shaped compatibility surface. */
export const families = {
  sans: font.family,
  serif: font.serif,
  mono: font.mono,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/** Required Warm Planning Desk II radii plus shipped consumer aliases. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 18,
  rating: 14,
  card: 18,
  xl: 26,
  focusFab: 26,
  sheet: 28,
  pill: 999,
} as const;

/** v2 plural spelling retained for existing mobile consumers. */
export const radii = radius;

export const duration = { fast: 200, base: 280 } as const;

const signatureNames = {
  taskToFocusMorph: 'task-to-focus-morph',
  blockInkFill: 'block-ink-fill',
  cascadeDock: 'cascade-dock',
  habitChainPulse: 'habit-chain-pulse',
  waveformToChipSettle: 'waveform-to-chip-settle',
} as const;

export const signatureMotion = signatureNames;

export const reducedMotion = {
  behavior: 'fade',
  replacement: 'fade',
  duration: duration.fast,
  honorsSystemPreference: true,
  honorsInAppSetting: true,
} as const;

/** Motion is limited to the five design-law signatures; all other changes are instant. */
export const motion = {
  ease: 'cubic-bezier(.2,.8,.2,1)',
  easeIn: 'cubic-bezier(.4,0,1,1)',
  easeOut: 'cubic-bezier(.2,.8,.2,1)',
  duration,
  ...signatureNames,
  signature: signatureNames,
  signatures: signatureNames,
  reducedMotion,
} as const;

export const shadow = {
  low: '0 2px 8px rgba(43, 38, 33, .08)',
  medium: '0 3px 10px rgba(43, 38, 33, .25)',
  high: '0 4px 14px rgba(43, 38, 33, .30)',
  sheet: '0 -8px 30px rgba(43, 38, 33, .30)',
  fabAccent: '0 5px 15px rgba(103, 83, 199, .28)',
  fabAccentHi: '0 5px 16px rgba(103, 83, 199, .40)',
  notif: '0 2px 10px rgba(43, 38, 33, .12)',
  // Legacy v1 names.
  fab: '0 10px 30px rgba(240,138,62,.30)',
  fabNative: {
    shadowColor: color.ember,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

/** Existing v2 elevation export retained, now sourced from the design-law shadows. */
export const elevation = {
  low: shadow.low,
  medium: shadow.medium,
  high: shadow.high,
  sheet: shadow.sheet,
  fabAccent: shadow.fabAccent,
  fabAccentHi: shadow.fabAccentHi,
  notif: shadow.notif,
} as const;

export const elevationNative = {
  low: {
    shadowColor: '#2B2621',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#2B2621',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  high: {
    shadowColor: '#2B2621',
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#2B2621',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  fabAccent: {
    shadowColor: '#6753C7',
    shadowOpacity: 0.28,
    shadowRadius: 7.5,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  fabAccentHi: {
    shadowColor: '#6753C7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  notif: {
    shadowColor: '#2B2621',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;

/** Timer ring geometry retained for compatibility with the shipped Focus surface. */
export const ring = {
  size: 312,
  radius: 146,
  get circumference() {
    return 2 * Math.PI * this.radius;
  },
} as const;

/** Emits the legacy token set as CSS custom properties for the dormant web app. */
export function tokensToCssVars(): string {
  const vars: Record<string, string> = {
    '--bg-deep': color.bgDeep,
    '--bg': color.bg,
    '--bg-focus': color.bgFocus,
    '--surface': color.surface,
    '--surface-2': color.surface2,
    '--surface-3': color.surface3,
    '--line': color.line,
    '--line-soft': color.lineSoft,
    '--line-hi': color.lineHi,
    '--track-hairline': color.trackHairline,
    '--t1': color.t1,
    '--t2': color.t2,
    '--t3': color.t3,
    '--t4': color.t4,
    '--t5': color.t5,
    '--ember': color.ember,
    '--ember-hi': color.emberHi,
    '--ember-dim': color.emberDim,
    '--green': color.green,
    '--ember-wash': color.emberWash,
    '--ember-line': color.emberLine,
    '--green-wash': color.greenWash,
    '--green-line': color.greenLine,
    '--danger': color.danger,
    '--danger-dim': color.dangerDim,
    '--goal-mauve': color.goalMauve,
    '--goal-blue': color.goalBlue,
    '--goal-tan': color.goalTan,
    '--ease': motion.ease,
    '--ease-in': motion.easeIn,
  };
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join('');
}
