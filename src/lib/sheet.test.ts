import { describe, expect, it } from 'vitest';
import { createGameRow, cycleWindOrderAtSeat, getTieBreakOrder, isRowEmpty, resolveGameRow } from './sheet';

describe('resolveGameRow', () => {
  it('auto-fills the fourth score when three are provided', () => {
    const row = createGameRow();
    row.scores = ['350', '280', '220', ''];

    expect(resolveGameRow(row)).toEqual({
      kind: 'complete',
      scores: [35000, 28000, 22000, 15000],
      autoFilledSeat: 3,
    });
  });

  it('detects mismatched total when all four values are entered', () => {
    const row = createGameRow();
    row.scores = ['350', '280', '220', '140'];

    expect(resolveGameRow(row)).toEqual({
      kind: 'mismatch',
      diff: -1000,
    });
  });

  it('accepts negative score inputs', () => {
    const row = createGameRow();
    row.scores = ['350', '280', '380', '-10'];

    expect(resolveGameRow(row)).toEqual({
      kind: 'complete',
      scores: [35000, 28000, 38000, -1000],
      autoFilledSeat: null,
    });
  });

  it('detects empty rows', () => {
    expect(isRowEmpty(createGameRow())).toBe(true);
  });
});

describe('wind assignment helpers', () => {
  it('starts with all seats unspecified', () => {
    expect(createGameRow().windOrder).toEqual([null, null, null, null]);
  });

  it('cycles through only unused wind options plus dash', () => {
    const windOrder = [0, 1, null, null] as const;

    expect(cycleWindOrderAtSeat(windOrder, 2)).toEqual([0, 1, 2, null]);
    expect(cycleWindOrderAtSeat([0, 1, 2, null], 2)).toEqual([0, 1, 3, null]);
    expect(cycleWindOrderAtSeat([0, 1, 3, null], 2)).toEqual([0, 1, null, null]);
  });

  it('fills unspecified seats left to right for tie-break order', () => {
    const windOrder = [null, 2, null, null] as const;

    expect([0, 1, 2, 3].map((seat) => getTieBreakOrder(windOrder, seat))).toEqual([0, 2, 1, 3]);
  });
});