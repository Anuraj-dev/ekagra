import { describe, expect, test } from 'bun:test';

import { accountSession, canStartFocusSession } from './index';

describe('Phase 0 core seam', () => {
  test('refuses to start without a bound task', () => {
    expect(canStartFocusSession(null)).toBe(false);
    expect(canStartFocusSession('   ')).toBe(false);
    expect(canStartFocusSession('task-1')).toBe(true);
  });

  test('counts honest minutes but only completed runs earn a block', () => {
    expect(accountSession('abandoned', 12.9)).toEqual({ honestMinutes: 12, earnedBlock: false });
    expect(accountSession('completed', 25)).toEqual({ honestMinutes: 25, earnedBlock: true });
  });
});
