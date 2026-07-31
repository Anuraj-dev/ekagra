import { describe, expect, it } from 'bun:test';
import {
  color,
  dark,
  elevation,
  font,
  goalPalette,
  light,
  motion,
  radius,
  ring,
  shadow,
  space,
  themes,
  tokensToCssVars,
  withAlpha,
} from './index';

describe('shared token contract', () => {
  it('exposes the exact Warm Planning Desk II semantic cores', () => {
    expect({
      bg: light.bg,
      surface: light.surface,
      ink: light.ink,
      accent: light.accent,
      success: light.success,
      danger: light.danger,
    }).toEqual({
      bg: '#FBF7F0',
      surface: '#F3EDE2',
      ink: '#2B2621',
      accent: '#6753C7',
      success: '#3F7D58',
      danger: '#B3492E',
    });
    expect({
      bg: dark.bg,
      surface: dark.surface,
      ink: dark.ink,
      accent: dark.accent,
      success: dark.success,
      danger: dark.danger,
    }).toEqual({
      bg: '#1E1B17',
      surface: '#2A2520',
      ink: '#F1EAE0',
      accent: '#8F7CE8',
      success: '#6FBF8B',
      danger: '#E38266',
    });
    expect(themes.light).toBe(light);
    expect(themes.dark).toBe(dark);
  });

  it('keeps shared typography, geometry, and elevation names available', () => {
    expect(font.family).toContain('Instrument Sans');
    expect(font.serif).toContain('Source Serif 4');
    expect(font.mono).toContain('JetBrains Mono');
    expect({ md: radius.md, xl: radius.xl, sheet: radius.sheet, pill: radius.pill }).toEqual({
      md: 14,
      xl: 26,
      sheet: 28,
      pill: 999,
    });
    expect(Object.keys(shadow)).toEqual([
      'low',
      'medium',
      'high',
      'sheet',
      'fabAccent',
      'fabAccentHi',
      'notif',
      'fab',
      'fabNative',
    ]);
    expect(elevation.sheet).toBe(shadow.sheet);
    expect(space[4]).toBe(16);
  });

  it('names only the five signatures and declares reduced-motion behavior', () => {
    expect(motion.signatures).toEqual({
      taskToFocusMorph: 'task-to-focus-morph',
      blockInkFill: 'block-ink-fill',
      cascadeDock: 'cascade-dock',
      habitChainPulse: 'habit-chain-pulse',
      waveformToChipSettle: 'waveform-to-chip-settle',
    });
    expect(motion.reducedMotion).toMatchObject({
      behavior: 'fade',
      replacement: 'fade',
      honorsSystemPreference: true,
      honorsInAppSetting: true,
    });
  });

  it('preserves legacy helpers and exports', () => {
    expect(withAlpha('#abc', 0.5)).toBe('rgba(170,187,204,0.5)');
    expect(goalPalette).toEqual([color.goalMauve, color.goalBlue, color.green, color.goalTan]);
    expect(ring.circumference).toBeCloseTo(2 * Math.PI * ring.radius);
    expect(tokensToCssVars()).toContain('--bg-deep:#07080A;');
  });
});
