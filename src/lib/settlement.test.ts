import { describe, expect, it } from 'vitest';
import { calculateOka, calculateScoreTotal, calculateSettlement } from './settlement';

describe('calculateSettlement', () => {
  it('keeps total settlement at zero with oka and placement bonuses', () => {
    const results = calculateSettlement(
      [
        { id: 'p1', name: 'A', score: 35200 },
        { id: 'p2', name: 'B', score: 28100 },
        { id: 'p3', name: 'C', score: 21900 },
        { id: 'p4', name: 'D', score: 14800 },
      ],
      {
        startPoint: 25000,
        returnPoint: 30000,
        placementBonus: [10, 5, -5, -10],
        applyOka: true,
      },
    );

    const total = results.reduce((sum, result) => sum + result.settlement, 0);
    expect(total).toBeCloseTo(0, 8);
    expect(results[0].settlement).toBeCloseTo(35.2, 8);
  });

  it('sorts by score descending and then id', () => {
    const results = calculateSettlement(
      [
        { id: 'p2', name: 'B', score: 21000 },
        { id: 'p1', name: 'A', score: 40000 },
        { id: 'p4', name: 'D', score: 18000 },
        { id: 'p3', name: 'C', score: 21000 },
      ],
      {
        startPoint: 25000,
        returnPoint: 30000,
        placementBonus: [10, 5, -5, -10],
        applyOka: true,
      },
    );

    expect(results.map((result) => result.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('computes the 25000 to 30000 oka as 20', () => {
    expect(calculateOka(25000, 30000)).toBe(20);
  });

  it('sums player scores', () => {
    expect(
      calculateScoreTotal([
        { id: 'p1', name: 'A', score: 25000 },
        { id: 'p2', name: 'B', score: 25000 },
        { id: 'p3', name: 'C', score: 25000 },
        { id: 'p4', name: 'D', score: 25000 },
      ]),
    ).toBe(100000);
  });
});