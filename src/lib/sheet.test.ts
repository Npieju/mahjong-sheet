import { describe, expect, it } from 'vitest';
import { createGameRow, isRowEmpty, resolveGameRow } from './sheet';

describe('resolveGameRow', () => {
  it('auto-fills the fourth score when three are provided', () => {
    const row = createGameRow();
    row.scores = ['35000', '28000', '22000', ''];

    expect(resolveGameRow(row)).toEqual({
      kind: 'complete',
      scores: [35000, 28000, 22000, 15000],
      autoFilledSeat: 3,
    });
  });

  it('detects mismatched total when all four values are entered', () => {
    const row = createGameRow();
    row.scores = ['35000', '28000', '22000', '14000'];

    expect(resolveGameRow(row)).toEqual({
      kind: 'mismatch',
      diff: -1000,
    });
  });

  it('detects empty rows', () => {
    expect(isRowEmpty(createGameRow())).toBe(true);
  });
});