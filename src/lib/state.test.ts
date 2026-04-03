import { describe, expect, it } from 'vitest';
import { deserializeState, normalizeState, serializeState, type AppState } from './state';
import { DEFAULT_RULE } from './settlement';

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
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, 2, null, 1] }],
    });

    expect(state).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, 2, null, 1] }],
      rules: DEFAULT_RULE,
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
    expect(state?.games[0]?.windOrder).toEqual([null, null, null, null]);
    expect(state?.rules).toEqual(DEFAULT_RULE);
  });

  it('falls back to defaults when names are missing but games are valid', () => {
    const state = normalizeState({
      games: [{ scores: ['350', '280', '220', '150'] }],
    });

    expect(state?.playerNames).toEqual(['東', '南', '西', '北']);
    expect(state?.games).toHaveLength(1);
    expect(state?.games[0]?.scores).toEqual(['350', '280', '220', '150']);
    expect(state?.games[0]?.windOrder).toEqual([0, 1, 2, 3]);
    expect(state?.rules).toEqual(DEFAULT_RULE);
  });

  it('migrates legacy east-seat rows into full wind order', () => {
    const state = normalizeState({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], eastSeat: 2 }],
    });

    expect(state?.games[0]?.windOrder).toEqual([2, 3, 0, 1]);
    expect(state?.rules).toEqual(DEFAULT_RULE);
  });

  it('accepts a current rule shape', () => {
    const state = normalizeState({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: { startPoint: 30000, uma: [20, 10, -10, -20] },
    });

    expect(state?.rules).toEqual({ startPoint: 30000, uma: [20, 10, -10, -20] });
  });

  it('reads legacy rule data and keeps the Mahjong Soul-compatible parts', () => {
    const state = normalizeState({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: 'g-1', scores: ['449', '343', '229', '-21'], windOrder: [null, null, null, null] }],
      rules: { startPoint: 25000, returnPoint: 30000, okaPoints: 20000, uma: [15, 5, -5, -15] },
    });

    expect(state?.rules).toEqual(DEFAULT_RULE);
  });

  it('returns null for unrelated malformed data', () => {
    expect(normalizeState({ foo: 'bar' })).toBeNull();
  });
});

describe('share serialization', () => {
  it('uses a compact format for default names', () => {
    const serialized = serializeState({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: DEFAULT_RULE,
    });

    expect(serialized).toBe('v2|350,280,220,150');
  });

  it('round-trips custom names and multiple rows', () => {
    const state: AppState = {
      playerNames: ['A', 'B', 'C', 'D'],
      games: [
        { id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [2, 3, 0, 1] },
        { id: 'g-2', scores: ['250', '250', '250', '250'], windOrder: [null, null, null, null] },
      ],
      rules: DEFAULT_RULE,
    };

    expect(deserializeState(serializeState(state))).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [
        { id: expect.any(String), scores: ['350', '280', '220', '150'], windOrder: [2, 3, 0, 1] },
        { id: expect.any(String), scores: ['250', '250', '250', '250'], windOrder: [null, null, null, null] },
      ],
      rules: DEFAULT_RULE,
    });
  });

  it('keeps old shared URLs readable', () => {
    const legacyState: AppState = {
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: DEFAULT_RULE,
    };

    expect(deserializeState(serializeLegacyState(legacyState))).toEqual(legacyState);
  });

  it('is shorter than the legacy base64 JSON format', () => {
    const state: AppState = {
      playerNames: ['東', '南', '西', '北'],
      games: [
        { id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] },
        { id: 'g-2', scores: ['270', '260', '250', '220'], windOrder: [3, 0, 1, 2] },
      ],
      rules: DEFAULT_RULE,
    };

    expect(serializeState(state).length).toBeLessThan(serializeLegacyState(state).length);
  });

  it('adds wind-order only when it is not the default', () => {
    const serialized = serializeState({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, 2, null, 1] }],
      rules: DEFAULT_RULE,
    });

    expect(serialized).toBe('v2|350,280,220,150@-2-1');
  });

  it('keeps compact links with old east-seat suffix readable', () => {
    expect(deserializeState('v2|350,280,220,150@2')).toEqual({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: expect.any(String), scores: ['350', '280', '220', '150'], windOrder: [2, 3, 0, 1] }],
      rules: DEFAULT_RULE,
    });
  });

  it('serializes non-default rules compactly', () => {
    const serialized = serializeState({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: 'g-1', scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: { startPoint: 30000, uma: [20, 10, -10, -20] },
    });

    expect(serialized).toBe('v2|350,280,220,150|r:30000,20,10,-10,-20');
  });

  it('keeps old compact links with return-point and oka readable', () => {
    expect(deserializeState('v2|350,280,220,150|r:25000,30000,20,15,5,-5,-15')).toEqual({
      playerNames: ['東', '南', '西', '北'],
      games: [{ id: expect.any(String), scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: DEFAULT_RULE,
    });
  });

  it('keeps old compact links with unprefixed custom names readable', () => {
    expect(deserializeState('v2|350,280,220,150|A|B|C|D')).toEqual({
      playerNames: ['A', 'B', 'C', 'D'],
      games: [{ id: expect.any(String), scores: ['350', '280', '220', '150'], windOrder: [null, null, null, null] }],
      rules: DEFAULT_RULE,
    });
  });
});