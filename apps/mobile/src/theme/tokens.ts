/**
 * Design tokens are shared with the web app, not duplicated. The token module in
 * apps/web/src/theme/tokens.ts was authored platform-neutral (plain hex/number/string
 * values) precisely so Expo can consume the exact same source of truth. Metro watches
 * the workspace root (see metro.config.js), so this relative import resolves cleanly.
 *
 * Only the web-only `tokensToCssVars` helper is irrelevant here; everything else
 * (color, goalPalette, radius, space, font, motion, shadow, ring) is reused as-is.
 */

export type { ThemeColors, ThemeName } from '../../../web/src/theme/tokens';
export {
  color,
  dark,
  duration,
  elevation,
  elevationNative,
  families,
  font,
  goalPalette,
  light,
  motion,
  radii,
  radius,
  ring,
  shadow,
  space,
  themes,
  withAlpha,
} from '../../../web/src/theme/tokens';
