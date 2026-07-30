import { describe, expect, it } from 'bun:test';
import type { Goal, Identity } from '@ekagra/core';
import {
  defaultIdentity,
  identityFields,
  identityLabel,
  identitySelectionChanged,
  isSelectionComplete,
  orderIdentities,
  selectionForGoal,
} from './identities';

function identity(id: string, name: string, createdAt = '2026-07-01T00:00:00.000Z'): Identity {
  return { id, name, isDefault: name === 'Me', createdAt, updatedAt: createdAt };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Ship v2',
    identityRole: 'Builder',
    deadline: null,
    archivedAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

const builder = identity('id-builder', 'Builder', '2026-07-01T00:00:00.000Z');
const me = identity('id-me', 'Me', '2026-07-02T00:00:00.000Z');

describe('defaultIdentity', () => {
  it('prefers Me so capture stays one tap', () => {
    expect(defaultIdentity([builder, me])?.id).toBe('id-me');
  });

  it('falls back to the first identity, then to nothing', () => {
    expect(defaultIdentity([builder])?.id).toBe('id-builder');
    expect(defaultIdentity([])).toBeNull();
  });
});

describe('orderIdentities', () => {
  it('leads with the default identity', () => {
    expect(orderIdentities([builder, me]).map((item) => item.name)).toEqual(['Me', 'Builder']);
  });
});

describe('selectionForGoal', () => {
  it('opens on the goal identity id', () => {
    expect(selectionForGoal(goal({ identityId: 'id-builder' }), [builder, me])).toEqual({
      kind: 'existing',
      id: 'id-builder',
    });
  });

  it('resolves a legacy goal through its identity role', () => {
    expect(selectionForGoal(goal(), [builder, me])).toEqual({
      kind: 'existing',
      id: 'id-builder',
    });
  });

  it('falls back to the default identity for an unknown role', () => {
    expect(selectionForGoal(goal({ identityRole: 'Ghost' }), [builder, me])).toEqual({
      kind: 'existing',
      id: 'id-me',
    });
  });
});

describe('identityFields', () => {
  it('sends an existing identity as an id', () => {
    expect(identityFields({ kind: 'existing', id: 'id-me' })).toEqual({ identityId: 'id-me' });
  });

  it('sends a typed identity as a trimmed name', () => {
    expect(identityFields({ kind: 'new', name: '  Student ' })).toEqual({
      identityRole: 'Student',
    });
  });

  it('sends nothing while a new identity is unnamed', () => {
    expect(identityFields({ kind: 'new', name: '   ' })).toEqual({});
    expect(isSelectionComplete({ kind: 'new', name: '   ' })).toBe(false);
    expect(isSelectionComplete(null)).toBe(false);
    expect(isSelectionComplete({ kind: 'existing', id: 'id-me' })).toBe(true);
  });
});

describe('identityLabel', () => {
  it('prefers the loaded identity name over the mirrored role', () => {
    expect(identityLabel(goal({ identityId: 'id-me', identityRole: 'Builder' }), [me])).toBe('Me');
  });

  it('falls back to the mirrored role when identities are not loaded', () => {
    expect(identityLabel(goal({ identityId: 'id-me' }), [])).toBe('Builder');
  });
});

describe('identitySelectionChanged', () => {
  const legacyGoal = goal();
  const linkedGoal = goal({ identityId: 'id-builder' });

  it('is false while the picker still holds the goal identity', () => {
    expect(
      identitySelectionChanged({ kind: 'existing', id: 'id-builder' }, linkedGoal, [builder, me]),
    ).toBe(false);
    // A legacy goal resolved through its role is not a change either.
    expect(
      identitySelectionChanged({ kind: 'existing', id: 'id-builder' }, legacyGoal, [builder, me]),
    ).toBe(false);
  });

  it('is true when another identity is picked', () => {
    expect(
      identitySelectionChanged({ kind: 'existing', id: 'id-me' }, linkedGoal, [builder, me]),
    ).toBe(true);
  });

  it('is true only for a new name that differs from the current one', () => {
    expect(identitySelectionChanged({ kind: 'new', name: 'Builder' }, linkedGoal, [builder])).toBe(
      false,
    );
    expect(identitySelectionChanged({ kind: 'new', name: 'Student' }, linkedGoal, [builder])).toBe(
      true,
    );
    expect(identitySelectionChanged({ kind: 'new', name: ' ' }, linkedGoal, [builder])).toBe(false);
  });
});
