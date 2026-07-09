import { describe, expect, test } from 'bun:test';

import {
  parseDeviceActionRequest,
  parseEveningCloseRequest,
  parseMorningCommitRequest,
  parseSessionCommand,
  parseSessionStartRequest,
} from './api';

const taskId = '20000000-0000-0000-0000-000000000001';

describe('API contract validators', () => {
  test('accepts valid session and ritual input', () => {
    expect(parseSessionStartRequest({ taskId, durations: { workMinutes: 50 } })).toEqual({
      taskId,
      durations: { workMinutes: 50 },
    });
    expect(parseSessionCommand({ action: 'abandon', distractionTag: 'energy' })).toEqual({
      action: 'abandon',
      distractionTag: 'energy',
    });
    expect(parseMorningCommitRequest({ taskIds: [taskId] })).toEqual({ taskIds: [taskId] });
    expect(parseEveningCloseRequest({ planMatch: true, wentWrongTag: 'none' })).toEqual({
      planMatch: true,
      wentWrongTag: 'none',
      note: undefined,
    });
    expect(parseDeviceActionRequest({ action: 'pause' })).toEqual({ action: 'pause' });
  });

  test('rejects missing tasks, duplicate plans, and unsupported actions', () => {
    expect(() => parseSessionStartRequest({ taskId: 'not-a-uuid' })).toThrow('UUID');
    expect(() => parseMorningCommitRequest({ taskIds: [taskId, taskId] })).toThrow('unique');
    expect(() => parseDeviceActionRequest({ action: 'resume' })).toThrow('start_next_planned');
  });
});
