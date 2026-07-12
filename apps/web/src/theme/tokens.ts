/**
 * Ekagra design tokens — the single source of truth for color, type, spacing,
 * radius, and motion. Kept as a plain TS object with no web-only coupling so the
 * Expo app can import the same values later (hex, numbers, cubic-bezier strings).
 *
 * Values are transcribed from docs/design/refined/DESIGN-SPEC.md. Hex is truth.
 */

export const color = {
  // Surfaces & lines
  bgDeep: '#07080A',
  bg: '#0E0F12',
  bgFocus: '#0A0B0E',
  surface: '#16181D',
  surface2: '#111318',
  surface3: '#1B1E24',
  line: '#23262E',
  lineSoft: '#1D2028',
  lineHi: '#3A3F49',
  // Text ramp
  t1: '#ECEDEF',
  t2: '#B9BDC4',
  t3: '#8A8F98',
  t4: '#6B7078',
  t5: '#41454D',
  // Accents
  ember: '#F08A3E',
  emberHi: '#FFB25E',
  emberDim: '#7C5638',
  green: '#5BBF8A',
  // Destructive / error — systematized from the raw hex previously inlined app-wide.
  danger: '#E4796B',
  dangerDim: '#3A2320',
  // Goal hues
  goalMauve: '#C48FBF',
  goalBlue: '#7C9BC4',
  goalTan: '#B7A46B',
  // Accent tints (wells / fills only — never gradients). See spec §2.
  emberWash: 'rgba(240,138,62,0.10)',
  emberLine: 'rgba(240,138,62,0.45)',
  greenWash: 'rgba(91,191,138,0.12)',
  greenLine: 'rgba(91,191,138,0.40)',
} as const;

/**
 * Returns a `hex` color at the given `alpha` (0–1) as an `rgba()` string. Covers the
 * one-off tint cases the named wash/line tokens don't. Accepts #RGB or #RRGGBB.
 */
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

/** Ordered palette assigned to goals deterministically. Ember is reserved for system meaning. */
export const goalPalette = [color.goalMauve, color.goalBlue, color.green, color.goalTan] as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
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

export const font = {
  family: "'Manrope', system-ui, sans-serif",
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800 },
} as const;

export const motion = {
  ease: 'cubic-bezier(.2,.8,.2,1)',
  easeIn: 'cubic-bezier(.4,0,1,1)',
} as const;

export const shadow = {
  fab: '0 10px 30px rgba(240,138,62,.30)',
  sheet: '0 -8px 40px rgba(0,0,0,.55)',
} as const;

/** Timer ring geometry (SVG). Circumference = 2π·r. */
export const ring = {
  size: 312,
  radius: 146,
  get circumference() {
    return 2 * Math.PI * this.radius;
  },
} as const;

/** Emits the token set as CSS custom properties on :root. Web-only helper. */
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
    .map(([k, v]) => `${k}:${v};`)
    .join('');
}
