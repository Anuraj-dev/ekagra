import type { Goal } from '@ekagra/core';
import { color, goalPalette } from '@ekagra/tokens';

/**
 * Goal color is data (DESIGN-SPEC §2/§5). The API has no color field, so we assign
 * one deterministically from the goal palette in stable creation order. The same
 * goal always maps to the same hue across sessions. Shared logic with the web app.
 */
export function buildGoalColorMap(goals: Goal[]): Map<string, string> {
  const ordered = [...goals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const map = new Map<string, string>();
  ordered.forEach((goal, index) => {
    map.set(goal.id, goalPalette[index % goalPalette.length]);
  });
  return map;
}

/** Color for a task's goal, falling back to the "unassigned" tan for a null goal. */
export function goalColor(goalId: string | null, colorMap: Map<string, string>): string {
  if (!goalId) return color.goalTan;
  return colorMap.get(goalId) ?? color.goalTan;
}

export function goalName(goalId: string | null, goals: Goal[]): string {
  if (!goalId) return 'Unassigned';
  return goals.find((g) => g.id === goalId)?.title ?? 'Unassigned';
}
