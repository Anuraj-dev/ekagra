import { describe, expect, test } from 'bun:test';

import {
  parseDayRecord,
  parseDeviceActionRequest,
  parseEveningCloseRequest,
  parseGoalCreateRequest,
  parseGoalUpdateRequest,
  parseIdentity,
  parseMorningCommitRequest,
  parseSessionCommand,
  parseSessionStartRequest,
  parseTaskCreateRequest,
  parseTaskStatus,
  parseTaskUpdateRequest,
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

  test('passes through v2 task, goal, and session fields', () => {
    const clientOpId = '60000000-0000-0000-0000-000000000001';
    expect(
      parseTaskCreateRequest({
        title: 'Plan launch',
        priority: 'p1',
        scheduledFor: '2026-07-14',
        scheduledTime: '23:59',
        deadline: '2026-07-20',
        notes: 'Prepare the checklist.',
        clientOpId,
      }),
    ).toMatchObject({
      priority: 'p1',
      scheduledFor: '2026-07-14',
      scheduledTime: '23:59',
      deadline: '2026-07-20',
      notes: 'Prepare the checklist.',
      clientOpId,
    });
    expect(parseTaskUpdateRequest({ priority: null, scheduledTime: null, notes: null })).toEqual({
      priority: null,
      scheduledTime: null,
      notes: null,
    });
    expect(
      parseGoalCreateRequest({
        title: 'Ship v2',
        identityRole: 'Builder',
        priority: 'p2',
        clientOpId,
      }),
    ).toMatchObject({ priority: 'p2', clientOpId });
    expect(parseGoalUpdateRequest({ priority: null })).toEqual({ priority: null });
    expect(parseSessionStartRequest({ taskId, clientOpId })).toEqual({
      taskId,
      durations: undefined,
      clientOpId,
    });
  });

  test('rejects invalid v2 task and goal fields', () => {
    expect(() => parseTaskCreateRequest({ title: 'Bad priority', priority: 'p0' })).toThrow(
      'priority',
    );
    expect(() => parseTaskCreateRequest({ title: 'Bad time', scheduledTime: '24:00' })).toThrow(
      'scheduledTime',
    );
    expect(() => parseTaskUpdateRequest({ notes: 'x'.repeat(2001) })).toThrow('notes');
    expect(() => parseGoalUpdateRequest({ priority: 'urgent' })).toThrow('priority');
    expect(() => parseSessionStartRequest({ taskId, clientOpId: 'not-a-uuid' })).toThrow('UUID');
  });
});

describe('goal identity seam', () => {
  const identityId = '70000000-0000-0000-0000-000000000001';

  test('accepts either identity seam on create and update', () => {
    expect(parseGoalCreateRequest({ title: 'Ship v2', identityId })).toMatchObject({ identityId });
    expect(parseGoalCreateRequest({ title: 'Ship v2', identityRole: ' Builder ' })).toMatchObject({
      identityRole: 'Builder',
    });
    expect(parseGoalUpdateRequest({ identityId })).toEqual({ identityId });
    expect(parseGoalUpdateRequest({ identityRole: 'Student' })).toEqual({
      identityRole: 'Student',
    });
  });

  test('rejects a missing, doubled, or malformed identity', () => {
    expect(() => parseGoalCreateRequest({ title: 'No identity' })).toThrow('identityId');
    expect(() =>
      parseGoalCreateRequest({ title: 'Both', identityId, identityRole: 'Builder' }),
    ).toThrow('not both');
    expect(() => parseGoalCreateRequest({ title: 'Bad id', identityId: 'not-a-uuid' })).toThrow(
      'UUID',
    );
    expect(() => parseGoalUpdateRequest({ identityId: 'not-a-uuid' })).toThrow('UUID');
  });

  test('an identity-only update is a valid patch', () => {
    expect(() => parseGoalUpdateRequest({})).toThrow('At least one goal field');
    expect(parseGoalUpdateRequest({ identityId }).identityId).toBe(identityId);
  });
});

describe('parseIdentity', () => {
  test('maps an identities row into a typed Identity', () => {
    expect(
      parseIdentity({
        id: '70000000-0000-0000-0000-000000000002',
        name: 'Me',
        is_default: true,
        created_at: '2026-07-31T00:00:00.000Z',
        updated_at: '2026-07-31T00:00:00.000Z',
      }),
    ).toEqual({
      id: '70000000-0000-0000-0000-000000000002',
      name: 'Me',
      isDefault: true,
      createdAt: '2026-07-31T00:00:00.000Z',
      updatedAt: '2026-07-31T00:00:00.000Z',
    });
  });

  test('rejects a row without a usable name', () => {
    expect(() =>
      parseIdentity({
        id: '70000000-0000-0000-0000-000000000003',
        name: '',
        is_default: false,
        created_at: '2026-07-31T00:00:00.000Z',
        updated_at: '2026-07-31T00:00:00.000Z',
      }),
    ).toThrow('name');
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
