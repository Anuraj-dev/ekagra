import { describe, expect, test } from 'bun:test';

import {
  parseDayRecord,
  parseDeviceActionRequest,
  parseEveningCloseRequest,
  parseMorningCommitRequest,
  parseSessionCommand,
  parseSessionStartRequest,
  parseTaskStatus,
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
    expect(parseSessionCommand({ action: 'completeEarly' })).toEqual({ action: 'completeEarly' });
    expect(parseMorningCommitRequest({ taskIds: [taskId] })).toEqual({ taskIds: [taskId] });
    expect(parseMorningCommitRequest({ taskIds: [] })).toEqual({ taskIds: [] });
    expect(parseEveningCloseRequest({ planMatch: true, wentWrongTag: 'none' })).toEqual({
      planMatch: true,
      wentWrongTag: 'none',
      note: undefined,
    });
    expect(parseDeviceActionRequest({ action: 'pause' })).toEqual({ action: 'pause' });
  });

  test('rejects missing tasks, duplicate plans, and unsupported actions', () => {
    expect(() => parseSessionStartRequest({ taskId: 'not-a-uuid' })).toThrow('UUID');
    expect(() =>
      parseSessionStartRequest({ taskId: '20000000-0000-0000-0000-00000000000z' }),
    ).toThrow('UUID');
    expect(() =>
      parseSessionStartRequest({ taskId: '200000000000-0000-0000-0000-000000000001' }),
    ).toThrow('UUID');
    expect(() => parseMorningCommitRequest({ taskIds: [taskId, taskId] })).toThrow('unique');
    expect(() => parseSessionCommand({ action: 'abandon', distractionTag: 'done-early' })).toThrow(
      'supported',
    );
    expect(() => parseDeviceActionRequest({ action: 'resume' })).toThrow('start_next_planned');
    expect(parseTaskStatus('planned')).toBe('planned');
    expect(() => parseTaskStatus('running')).toThrow('invalid');
  });
});

describe('parseDayRecord', () => {
  test('maps a closed-day row into a typed DayRecord', () => {
    expect(
      parseDayRecord({
        record_date: '2026-07-10',
        morning_task_ids: [taskId],
        plan_match: false,
        went_wrong_tag: 'scope-creep',
        note: 'ran long',
        updated_at: '2026-07-10T21:03:00.000Z',
      }),
    ).toEqual({
      recordDate: '2026-07-10',
      morningTaskIds: [taskId],
      planMatch: false,
      wentWrongTag: 'scope-creep',
      note: 'ran long',
      updatedAt: '2026-07-10T21:03:00.000Z',
    });
  });

  test('treats an un-closed row (null ritual fields) leniently', () => {
    expect(
      parseDayRecord({
        record_date: '2026-07-11',
        morning_task_ids: [],
        plan_match: null,
        went_wrong_tag: null,
        note: null,
        updated_at: '2026-07-11T08:31:00.000Z',
      }),
    ).toEqual({
      recordDate: '2026-07-11',
      morningTaskIds: [],
      planMatch: null,
      wentWrongTag: null,
      note: null,
      updatedAt: '2026-07-11T08:31:00.000Z',
    });
  });

  test('rejects a non-boolean plan_match', () => {
    expect(() =>
      parseDayRecord({
        record_date: '2026-07-10',
        morning_task_ids: [],
        plan_match: 'yes',
        updated_at: '2026-07-10T21:03:00.000Z',
      }),
    ).toThrow('plan_match');
  });

  test('rejects non-string note and went_wrong_tag instead of coercing', () => {
    const base = {
      record_date: '2026-07-10',
      morning_task_ids: [],
      plan_match: true,
      updated_at: '2026-07-10T21:03:00.000Z',
    };
    expect(() => parseDayRecord({ ...base, went_wrong_tag: 42 })).toThrow('went_wrong_tag');
    expect(() => parseDayRecord({ ...base, note: { text: 'x' } })).toThrow('note');
    expect(() => parseDayRecord({ ...base, note: 'x'.repeat(1001) })).toThrow('note');
  });
});
