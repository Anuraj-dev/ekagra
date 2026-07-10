import { describe, expect, it } from 'bun:test';
import type { Goal } from '@ekagra/core';
import { goalPalette } from '../theme/tokens';
import { buildGoalColorMap, goalColor, goalName } from './goals';

function goal(id: string, title: string, createdAt: string): Goal {
  return {
    id,
    title,
    identityRole: 'Builder',
    deadline: null,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

const goals = [
  goal('g2', 'Freelance', '2026-02-01T00:00:00Z'),
  goal('g1', 'Robotics Mission', '2026-01-01T00:00:00Z'),
];

describe('buildGoalColorMap', () => {
  it('assigns palette colors in stable creation order regardless of list order', () => {
    const map = buildGoalColorMap(goals);
    expect(map.get('g1')).toBe(goalPalette[0]);
    expect(map.get('g2')).toBe(goalPalette[1]);
    // Same assignment when the input order flips.
    const flipped = buildGoalColorMap([...goals].reverse());
    expect(flipped.get('g1')).toBe(goalPalette[0]);
    expect(flipped.get('g2')).toBe(goalPalette[1]);
  });
});

describe('goalColor / goalName', () => {
  it('falls back to the unassigned hue and name for null goals', () => {
    const map = buildGoalColorMap(goals);
    expect(goalColor(null, map)).toBeString();
    expect(goalName(null, goals)).toBe('Unassigned');
    expect(goalName('g1', goals)).toBe('Robotics Mission');
  });
});
