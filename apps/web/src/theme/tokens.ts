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
  trackHairline: '#1A1D23',
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
  /** React Native decomposition of `fab` (CSS blur 30 ≈ RN shadowRadius 15). */
  fabNative: {
    shadowColor: color.ember,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
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
    .map(([k, v]) => `${k}:${v};`)
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// v2 — "Warm Planning Desk". See docs/DESIGN.md (the design law) and the
// wireframes in docs/design/v2/. ADDITIVE: the v1 `color`/`radius`/`font`/`motion`/
// `shadow` exports above are the superseded dark-ember set and stay put only until
// the last v1 screen is deleted, then they go. v2 screens import the exports below.
// Hex is truth; light is primary, dark is derived (only Focus dark is in the wires).
// ─────────────────────────────────────────────────────────────────────────────

/** v2 light theme — primary. Roles map 1:1 to docs/DESIGN.md §2.1. */
export const light = {
  canvas: '#f7f1e8',
  canvasDeep: '#efe9dd',
  surface: '#fdfaf4',
  surfaceSunk: '#f2ead9',
  navBar: '#f2ebdd',
  ink: '#201914',
  inkOnDark: '#f7f1e8',
  /** Info-bearing secondary text (AA-safe on canvas ≈ 5.2:1). */
  textSecondary: '#6f6355',
  /** DECORATIVE only — ≈3.6:1 on canvas, never for info-bearing text (DESIGN §10). */
  textMetaDecorative: '#8a7c6c',
  textPlaceholder: '#a4977f',
  line: '#eae1d0',
  lineSoft: '#e6dcc9',
  lineInput: '#ddd2bf',
  lineStrong: '#c9bda8',
  accent: '#6753c7',
  accentPressed: '#52409f',
  accentOnDark: '#c3b6f5',
  dangerBg: '#f6e2dc',
  dangerLine: '#dcb2a4',
  dangerText: '#5d2b1c',
  snackbarBg: '#2a2119',
  /** Priority/status dots: high uses ink, mid uses this; low = transparent + ring. */
  priHigh: '#201914',
  priMid: '#a4977f',
} as const;

/** v2 dark theme — derived from light; refine against the screenshot loop. */
export const dark = {
  canvas: '#1c1712',
  canvasDeep: '#141009',
  surface: '#241d15',
  surfaceSunk: '#2a2119',
  navBar: '#201a12',
  ink: '#ede4d6',
  inkOnDark: '#1c1712',
  textSecondary: '#a4977f',
  textMetaDecorative: '#8a7c6c',
  textPlaceholder: '#6f6355',
  line: '#3a3128',
  lineSoft: '#3a3128',
  lineInput: '#4d4236',
  lineStrong: '#4d4236',
  accent: '#6753c7',
  accentPressed: '#52409f',
  accentOnDark: '#c3b6f5',
  dangerBg: '#3a2320',
  dangerLine: '#5d2b1c',
  dangerText: '#dcb2a4',
  snackbarBg: '#2a2119',
  priHigh: '#ede4d6',
  priMid: '#a4977f',
} as const;

/** A theme is the light shape with values widened to string (dark carries different hexes). */
export type ThemeColors = { readonly [K in keyof typeof light]: string };
export const themes = { light, dark } satisfies Record<string, ThemeColors>;
export type ThemeName = keyof typeof themes;

/** v2 font families (§3). Instrument Sans = UI, Source Serif 4 = display, JetBrains Mono = timer only. */
export const families = {
  sans: "'Instrument Sans', system-ui, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

/** v2 motion durations (ms). Reuse `motion.ease` above as ease-out; `motion.easeIn` for exits. */
export const duration = { fast: 200, base: 280 } as const;

/** v2 named elevation (§6) — CSS box-shadow strings. */
export const elevation = {
  low: '0 2px 8px rgba(32,25,20,.08)',
  medium: '0 3px 10px rgba(32,25,20,.25)',
  high: '0 4px 14px rgba(32,25,20,.30)',
  sheet: '0 -8px 30px rgba(32,25,20,.30)',
  fabAccent: '0 3px 10px rgba(103,83,199,.35)',
  fabAccentHi: '0 5px 16px rgba(103,83,199,.40)',
  notif: '0 2px 10px rgba(32,25,20,.12)',
} as const;

/** RN decomposition of `elevation` (CSS blur ≈ 2× shadowRadius). */
export const elevationNative = {
  low: {
    shadowColor: '#201914',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#201914',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  high: {
    shadowColor: '#201914',
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#201914',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  fabAccent: {
    shadowColor: '#6753c7',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabAccentHi: {
    shadowColor: '#6753c7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  notif: {
    shadowColor: '#201914',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;

/** v2 corner radii (§5). Named for their use-sites in the wireframes. */
export const radii = {
  xs: 8,
  sm: 12,
  rating: 14,
  card: 18,
  lg: 20,
  xl: 26,
  focusFab: 26,
  sheet: 28,
  pill: 999,
} as const;
