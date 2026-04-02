export type GameRow = {
  id: string;
  scores: [string, string, string, string];
};

export type ResolvedGameRow =
  | { kind: 'empty' }
  | { kind: 'partial' }
  | { kind: 'invalid' }
  | { kind: 'mismatch'; diff: number }
  | { kind: 'complete'; scores: [number, number, number, number]; autoFilledSeat: number | null };

export const TOTAL_POINTS = 100000;

export function createGameRow(): GameRow {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scores: ['', '', '', ''],
  };
}

function parseScore(value: string) {
  const trimmed = value.trim();

  if (trimmed === '' || trimmed === '-') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function isRowEmpty(row: GameRow) {
  return row.scores.every((score) => score.trim() === '');
}

export function resolveGameRow(row: GameRow, expectedTotal: number = TOTAL_POINTS): ResolvedGameRow {
  const parsedScores = row.scores.map(parseScore);
  const filledCount = parsedScores.filter((score) => typeof score === 'number' && !Number.isNaN(score)).length;

  if (filledCount === 0) {
    return { kind: 'empty' };
  }

  if (parsedScores.some((score) => Number.isNaN(score))) {
    return { kind: 'invalid' };
  }

  const missingSeats = parsedScores
    .map((score, seat) => ({ score, seat }))
    .filter((entry): entry is { score: null; seat: number } => entry.score === null);

  if (missingSeats.length >= 2) {
    return { kind: 'partial' };
  }

  if (missingSeats.length === 1) {
    const knownTotal = parsedScores.reduce<number>((sum, score) => sum + (score ?? 0), 0);
    const autoFilledSeat = missingSeats[0].seat;
    const scores = [...parsedScores] as [number | null, number | null, number | null, number | null];
    scores[autoFilledSeat] = expectedTotal - knownTotal;

    return {
      kind: 'complete',
      scores: scores as [number, number, number, number],
      autoFilledSeat,
    };
  }

  const scores = parsedScores as [number, number, number, number];
  const diff = scores.reduce((sum, score) => sum + score, 0) - expectedTotal;

  if (diff !== 0) {
    return { kind: 'mismatch', diff };
  }

  return {
    kind: 'complete',
    scores,
    autoFilledSeat: null,
  };
}