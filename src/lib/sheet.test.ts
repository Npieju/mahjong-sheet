import { describe, expect, it } from 'vitest';
import { createGameRow, isRowEmpty, resolveGameRow } from './sheet';

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