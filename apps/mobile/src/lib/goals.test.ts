import { describe, expect, it } from 'bun:test';
import type { Goal } from '@ekagra/core';
import { color, goalPalette } from '../theme/tokens';
import { buildGoalColorMap, goalColor, goalName } from './goals';

function goal(id: string, createdAt: string, title = id): Goal {
  return {
    id,
    title,
    identityRole: 'role',
    deadline: null,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('buildGoalColorMap', () => {
  it('assigns palette hues in stable creation order', () => {
    const goals = [goal('b', '2026-07-02T00:00:00.000Z'), goal('a', '2026-07-01T00:00:00.000Z')];
    const map = buildGoalColorMap(goals);
    // Sorted by createdAt: a first, b second.
    expect(map.get('a')).toBe(goalPalette[0]);
    expect(map.get('b')).toBe(goalPalette[1]);
  });
});

describe('goalColor', () => {
  it('falls back to tan for a null goal', () => {
    expect(goalColor(null, new Map())).toBe(color.goalTan);
  });
});

describe('goalName', () => {
  it('resolves a title and defaults unassigned', () => {
    const goals = [goal('a', '2026-07-01T00:00:00.000Z', 'Robotics')];
    expect(goalName('a', goals)).toBe('Robotics');
    expect(goalName(null, goals)).toBe('Unassigned');
  });
});
