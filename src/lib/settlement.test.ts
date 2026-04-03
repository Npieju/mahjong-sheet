import { describe, expect, it } from 'vitest';
import { calculateGameResults, getStandings, roundHalfDown } from './settlement';

describe('calculateGameResults', () => {
  it('applies Mahjong Soul style end-score calculation', () => {
    const results = calculateGameResults([
      { seat: 0, name: '東', score: 35700 },
      { seat: 1, name: '南', score: 32400 },
      { seat: 2, name: '西', score: 22200 },
      { seat: 3, name: '北', score: 9700 },
    ]);

    expect(results.map((result) => result.total)).toEqual([41, 7, -13, -35]);
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

  it('corrects rounding drift back to zero-sum on the winner', () => {
    const results = calculateGameResults([
      { seat: 0, name: '東', score: 69500 },
      { seat: 1, name: '南', score: 30500 },
      { seat: 2, name: '西', score: 0 },
      { seat: 3, name: '北', score: 0 },
    ]);

    expect(results.reduce((sum, result) => sum + result.total, 0)).toBe(0);
    expect(results[0].total).toBe(75);
  });

  it('applies custom oka and uma settings', () => {
    const results = calculateGameResults(
      [
        { seat: 0, name: '東', score: 35700 },
        { seat: 1, name: '南', score: 32400 },
        { seat: 2, name: '西', score: 32200 },
        { seat: 3, name: '北', score: 19700 },
      ],
      { startPoint: 30000, returnPoint: 30000, okaPoints: 0, uma: [20, 10, -10, -20] },
    );

    expect(results.map((result) => result.total)).toEqual([26, 12, -8, -30]);
  });
});

describe('helpers', () => {
  it('rounds halves down', () => {
    expect(roundHalfDown(35.7)).toBe(36);
    expect(roundHalfDown(35.5)).toBe(35);
    expect(roundHalfDown(-12.5)).toBe(-12);
  });

  it('builds standings with seat-order tie-break', () => {
    const standings = getStandings(['東', '南', '西', '北'], [20, 20, -10, -30]);
    expect(standings.map((entry) => entry.seat)).toEqual([0, 1, 2, 3]);
  });
});