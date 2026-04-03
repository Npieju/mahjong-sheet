import { describe, expect, it } from 'vitest';
import { normalizeState } from './state';

describe('normalizeState', () => {
  it('accepts the current app state shape', () => {
    const state = normalizeState({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'] }],
    });

    expect(state).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'] }],
    });
  });

  it('migrates the legacy player/rules shape into the current table state', () => {
    const state = normalizeState({
      players: [
        { id: 'p1', name: 'East', score: 35000 },
        { id: 'p2', name: 'South', score: 28000 },
        { id: 'p3', name: 'West', score: 22000 },
        { id: 'p4', name: 'North', score: 15000 },
      ],
      rules: { startScore: 25000 },
    });

    expect(state?.playerNames).toEqual(['East', 'South', 'West', 'North']);
    expect(state?.games).toHaveLength(1);
    expect(state?.games[0]?.scores).toEqual(['350', '280', '220', '150']);
  });

  it('falls back to defaults when names are missing but games are valid', () => {
    const state = normalizeState({
      games: [{ scores: ['350', '280', '220', '150'] }],
    });

    expect(state?.playerNames).toEqual(['東', '南', '西', '北']);
    expect(state?.games).toHaveLength(1);
    expect(state?.games[0]?.scores).toEqual(['350', '280', '220', '150']);
  });

  it('returns null for unrelated malformed data', () => {
    expect(normalizeState({ foo: 'bar' })).toBeNull();
  });
});