import { describe, expect, test } from 'bun:test';
import type { TodayPlan } from '@ekagra/core';
import { committedTodayTasks } from './today';

describe('committedTodayTasks', () => {
  test('exposes a task returned by the Plans API to the Tasks screen', () => {
    const today: TodayPlan = {
      plan: {
        id: '30000000-0000-0000-0000-000000000001',
        horizon: 'day',
        startsOn: '2026-08-01',
        parentPlanId: '30000000-0000-0000-0000-000000000002',
      },
      commitments: [
        {
          id: '40000000-0000-0000-0000-000000000001',
          subjectType: 'task',
          subjectId: '20000000-0000-0000-0000-000000000001',
          createdAt: '2026-07-31T20:00:00.000Z',
          task: {
            id: '20000000-0000-0000-0000-000000000001',
            title: 'API committed task',
            status: 'planned',
            goalId: null,
            estimatedBlocks: null,
            completedAt: null,
            createdAt: '2026-07-31T19:00:00.000Z',
            updatedAt: '2026-07-31T20:00:00.000Z',
          },
        },
      ],
    };

    expect(committedTodayTasks(today).map((task) => task.title)).toEqual(['API committed task']);
  });
});
