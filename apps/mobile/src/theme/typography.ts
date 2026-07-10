import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import type { TextStyle } from 'react-native';

/**
 * React Native has no font-weight-to-file mapping for custom fonts; each weight is a
 * distinct family. This maps the design spec's numeric weights (§3) to the loaded
 * Manrope faces so components can ask for a weight and get the right family.
 */
export const fontAssets = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
};

export type Weight = 400 | 500 | 600 | 700 | 800;

const FAMILY: Record<Weight, string> = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
  800: 'Manrope_800ExtraBold',
};

/** Returns the Manrope family name for a numeric weight. */
export function family(weight: Weight): string {
  return FAMILY[weight];
}

/** Builds a text style with the correct Manrope family for the given weight. */
export function text(weight: Weight, extra?: TextStyle): TextStyle {
  return { fontFamily: FAMILY[weight], ...extra };
}

/** The uppercase, tracked overline label style (DESIGN-SPEC §3). */
export const overline: TextStyle = {
  fontFamily: FAMILY[700],
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
};

/** Tabular numerals for anything that changes (timer, counts). */
export const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
};
