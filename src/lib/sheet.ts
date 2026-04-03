export type GameRow = {
  id: string;
  scores: [string, string, string, string];
  eastSeat: number;
};

export type ResolvedGameRow =
  | { kind: 'empty' }
  | { kind: 'partial' }
  | { kind: 'invalid' }
  | { kind: 'mismatch'; diff: number }
  | { kind: 'complete'; scores: [number, number, number, number]; autoFilledSeat: number | null };

export const SCORE_UNIT = 100;
export const TOTAL_POINTS = 100000;
export const TOTAL_SCORE_UNITS = TOTAL_POINTS / SCORE_UNIT;
export const WIND_LABELS = ['東', '南', '西', '北'] as const;

export function createGameRow(): GameRow {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scores: ['', '', '', ''],
    eastSeat: 0,
  };
}

export function normalizeEastSeat(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 4 ? value : 0;
}

export function getWindLabel(eastSeat: number, seat: number) {
  return WIND_LABELS[(seat - eastSeat + 4) % 4];
}

export function getTieBreakOrder(eastSeat: number, seat: number) {
  return (seat - eastSeat + 4) % 4;
}

function parseScore(value: string) {
  const trimmed = value.trim();

  if (trimmed === '' || trimmed === '-') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= -TOTAL_SCORE_UNITS && parsed <= TOTAL_SCORE_UNITS ? parsed : Number.NaN;
}

export function isRowEmpty(row: GameRow) {
  return row.scores.every((score) => score.trim() === '');
}

export function resolveGameRow(row: GameRow, expectedTotal: number = TOTAL_POINTS): ResolvedGameRow {
  const parsedScores = row.scores.map(parseScore);
  const expectedUnits = expectedTotal / SCORE_UNIT;
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
    scores[autoFilledSeat] = expectedUnits - knownTotal;

    return {
      kind: 'complete',
      scores: (scores as [number, number, number, number]).map((score) => score * SCORE_UNIT) as [number, number, number, number],
      autoFilledSeat,
    };
  }

  const scoreUnits = parsedScores as [number, number, number, number];
  const diff = (scoreUnits.reduce((sum, score) => sum + score, 0) - expectedUnits) * SCORE_UNIT;

  if (diff !== 0) {
    return { kind: 'mismatch', diff };
  }

  return {
    kind: 'complete',
    scores: scoreUnits.map((score) => score * SCORE_UNIT) as [number, number, number, number],
    autoFilledSeat: null,
  };
}