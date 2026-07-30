import type { Goal, Identity } from '@ekagra/core';

/**
 * What the identity picker holds: an existing identity, or a name typed for a new
 * one. The name seam stays because the goals identity trigger creates the identity
 * for the same owner, so no separate identity write is needed.
 */
export type IdentitySelection = { kind: 'existing'; id: string } | { kind: 'new'; name: string };

/** The default `Me` identity keeps capture one tap; fall back to the oldest identity. */
export function defaultIdentity(identities: Identity[]): Identity | null {
  return identities.find((identity) => identity.isDefault) ?? identities[0] ?? null;
}

/** Picker order: the default identity first, the rest in load order. */
export function orderIdentities(identities: Identity[]): Identity[] {
  const preferred = defaultIdentity(identities);
  if (!preferred) return [];
  return [preferred, ...identities.filter((identity) => identity.id !== preferred.id)];
}

/** The selection a sheet opens with: the goal's identity, else the default one. */
export function selectionForGoal(goal: Goal, identities: Identity[]): IdentitySelection | null {
  if (goal.identityId) return { kind: 'existing', id: goal.identityId };
  const match = identities.find((identity) => identity.name === goal.identityRole);
  if (match) return { kind: 'existing', id: match.id };
  const fallback = defaultIdentity(identities);
  return fallback ? { kind: 'existing', id: fallback.id } : null;
}

/**
 * The identity fields of a goal write. An existing identity travels as the
 * authoritative id; a typed name travels on the compatibility label seam.
 */
export function identityFields(selection: IdentitySelection | null): {
  identityId?: string;
  identityRole?: string;
} {
  if (!selection) return {};
  if (selection.kind === 'existing') return { identityId: selection.id };
  const name = selection.name.trim();
  return name.length > 0 ? { identityRole: name } : {};
}

/** True when the selection can be saved — a new identity needs a name. */
export function isSelectionComplete(selection: IdentitySelection | null): boolean {
  const fields = identityFields(selection);
  return fields.identityId !== undefined || fields.identityRole !== undefined;
}

/** The identity name to show for a goal, preferring the loaded identity row. */
export function identityLabel(goal: Goal, identities: Identity[]): string {
  const match = identities.find((identity) => identity.id === goal.identityId);
  return match?.name ?? goal.identityRole;
}

/** True when saving this selection would move the goal to a different identity. */
export function identitySelectionChanged(
  selection: IdentitySelection | null,
  goal: Goal,
  identities: Identity[],
): boolean {
  const fields = identityFields(selection);
  if (fields.identityId !== undefined) {
    const current = selectionForGoal(goal, identities);
    return current?.kind !== 'existing' || current.id !== fields.identityId;
  }
  if (fields.identityRole !== undefined) {
    return fields.identityRole !== identityLabel(goal, identities);
  }
  return false;
}
