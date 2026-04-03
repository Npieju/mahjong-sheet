import { describe, expect, it } from 'vitest';
import { calculateGameResults, formatDelta, getStandings } from './settlement';

describe('calculateGameResults', () => {
  it('matches Mahjong Soul style end-score display for a real result', () => {
    const results = calculateGameResults([
      { seat: 0, name: '東', score: 44900 },
      { seat: 1, name: '南', score: 34300 },
      { seat: 2, name: '西', score: 22900 },
      { seat: 3, name: '北', score: -2100 },
    ]);

    expect(results.map((result) => result.total)).toEqual([34.9, 14.3, -7.1, -42.1]);
    expect(results.map((result) => result.rank)).toEqual([1, 2, 3, 4]);
  });

  it('breaks ties by seat order', () => {
    const results = calculateGameResults([
      { seat: 0, name: '東', score: 30000 },
      { seat: 1, name: '南', score: 30000 },
      { seat: 2, name: '西', score: 25000 },
      { seat: 3, name: '北', score: 15000 },
    ]);

    expect(results.map((result) => result.rank)).toEqual([1, 2, 3, 4]);
  });

  it('breaks ties by the provided per-game wind order', () => {
    const results = calculateGameResults([
      { seat: 0, name: 'A', score: 30000, tieBreakOrder: 1 },
      { seat: 1, name: 'B', score: 30000, tieBreakOrder: 0 },
      { seat: 2, name: 'C', score: 25000, tieBreakOrder: 2 },
      { seat: 3, name: 'D', score: 15000, tieBreakOrder: 3 },
    ]);

    expect(results.map((result) => result.rank)).toEqual([2, 1, 3, 4]);
  });

  it('keeps totals zero-sum after decimal calculation', () => {
    const results = calculateGameResults([
      { seat: 0, name: '東', score: 69500 },
      { seat: 1, name: '南', score: 30500 },
      { seat: 2, name: '西', score: 0 },
      { seat: 3, name: '北', score: 0 },
    ]);

    expect(results.reduce((sum, result) => sum + result.total, 0)).toBe(0);
    expect(results[0].total).toBe(59.5);
  });

  it('applies custom oka and uma settings', () => {
    const results = calculateGameResults(
      [
        { seat: 0, name: '東', score: 35700 },
        { seat: 1, name: '南', score: 32400 },
        { seat: 2, name: '西', score: 32200 },
        { seat: 3, name: '北', score: 19700 },
      ],
      { startPoint: 30000, uma: [20, 10, -10, -20] },
    );

    expect(results.map((result) => result.total)).toEqual([25.7, 12.4, -7.8, -30.3]);
  });
});

describe('helpers', () => {
  it('formats deltas with one decimal place', () => {
    expect(formatDelta(34.9)).toBe('+34.9');
    expect(formatDelta(-42.1)).toBe('-42.1');
    expect(formatDelta(10)).toBe('+10.0');
  });

  it('builds standings with seat-order tie-break', () => {
    const standings = getStandings(['東', '南', '西', '北'], [20.1, 20.1, -10.4, -29.8]);
    expect(standings.map((entry) => entry.seat)).toEqual([0, 1, 2, 3]);
  });
});