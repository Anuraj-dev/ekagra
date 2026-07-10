import { describe, expect, it } from 'bun:test';
import { blockLabel, formatClock, formatLongDate, greeting } from './format';

describe('formatClock', () => {
  it('formats whole minutes', () => {
    expect(formatClock(25 * 60)).toBe('25:00');
  });

  it('pads seconds', () => {
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(61)).toBe('1:01');
  });

  it('clamps negatives to zero', () => {
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('blockLabel', () => {
  it('renders the focus sub-label', () => {
    expect(blockLabel(3, 3)).toBe('Block 3 of 3');
  });
});

describe('formatLongDate', () => {
  it('formats weekday, month, day', () => {
    expect(formatLongDate(new Date(2026, 6, 10))).toBe('Friday, July 10');
  });
});

describe('greeting', () => {
  it('is time-of-day dependent', () => {
    expect(greeting(new Date(2026, 6, 10, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 6, 10, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 6, 10, 21))).toBe('Good evening');
  });
});
