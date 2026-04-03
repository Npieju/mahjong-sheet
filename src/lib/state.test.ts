import { describe, expect, it } from 'vitest';
import { deserializeState, normalizeState, serializeState, type AppState } from './state';

function toLegacyBase64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function serializeLegacyState(state: AppState) {
  return toLegacyBase64Url(JSON.stringify(state));
}

describe('normalizeState', () => {
  it('accepts the current app state shape', () => {
    const state = normalizeState({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 2 }],
    });

    expect(state).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 2 }],
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
    expect(state?.games[0]?.eastSeat).toBe(0);
  });

  it('falls back to defaults when names are missing but games are valid', () => {
    const state = normalizeState({
      games: [{ scores: ['350', '280', '220', '150'] }],
    });

    expect(state?.playerNames).toEqual(['東', '南', '西', '北']);
    expect(state?.games).toHaveLength(1);
    expect(state?.games[0]?.scores).toEqual(['350', '280', '220', '150']);
    expect(state?.games[0]?.eastSeat).toBe(0);
  });

  it('returns null for unrelated malformed data', () => {
    expect(normalizeState({ foo: 'bar' })).toBeNull();
  });
});

describe('share serialization', () => {
  it('uses a compact format for default names', () => {
    const serialized = serializeState({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 0 }],
    });

    expect(serialized).toBe('v2|350,280,220,150');
  });

  it('round-trips custom names and multiple rows', () => {
    const state: AppState = {
      playerNames: ['A', 'B', 'C', 'D'],
      games: [
        { id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 2 },
        { id: 'g-2', scores: ['250', '250', '250', '250'], eastSeat: 0 },
      ],
    };

    expect(deserializeState(serializeState(state))).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [
        { id: expect.any(String), scores: ['350', '280', '220', '150'], eastSeat: 2 },
        { id: expect.any(String), scores: ['250', '250', '250', '250'], eastSeat: 0 },
      ],
    });
  });

  it('keeps old shared URLs readable', () => {
    const legacyState: AppState = {
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 0 }],
    };

    expect(deserializeState(serializeLegacyState(legacyState))).toEqual(legacyState);
  });

  it('is shorter than the legacy base64 JSON format', () => {
    const state: AppState = {
      playerNames: ['東', '南', '西', '北'],
      games: [
        { id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 0 },
        { id: 'g-2', scores: ['270', '260', '250', '220'], eastSeat: 3 },
      ],
    };

    expect(serializeState(state).length).toBeLessThan(serializeLegacyState(state).length);
  });

  it('adds east-seat only when it is not the default', () => {
    const serialized = serializeState({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 3 }],
    });

    expect(serialized).toBe('v2|350,280,220,150@3');
  });
});