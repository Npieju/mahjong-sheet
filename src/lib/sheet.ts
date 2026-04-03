export type GameRow = {
  id: string;
  scores: [string, string, string, string];
  windOrder: [number | null, number | null, number | null, number | null];
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
export const DEFAULT_WIND_ORDER = [null, null, null, null] as const;

export function createGameRow(): GameRow {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scores: ['', '', '', ''],
    windOrder: [...DEFAULT_WIND_ORDER],
  };
}

export function normalizeEastSeat(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 4 ? value : 0;
}

export function rotateWindOrder(eastSeat: number): [number, number, number, number] {
  return [0, 1, 2, 3].map((seat) => (seat - eastSeat + 4) % 4) as [number, number, number, number];
}

export function normalizeWindOrder(
  value: unknown,
  legacyEastSeat?: unknown,
): [number | null, number | null, number | null, number | null] {
  if (Array.isArray(value) && value.length === 4) {
    const normalized = value.map((entry) => (entry === null ? null : typeof entry === 'number' ? entry : Number.NaN));
    const numericValues = normalized.filter((entry): entry is number => entry !== null);
    const isValid = numericValues.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 4);

    if (isValid && new Set(numericValues).size === numericValues.length) {
      return normalized as [number | null, number | null, number | null, number | null];
    }
  }

  return rotateWindOrder(normalizeEastSeat(legacyEastSeat));
}

export function getWindLabel(windOrder: readonly (number | null)[], seat: number) {
  const wind = windOrder[seat];
  return wind === null || wind === undefined ? '-' : WIND_LABELS[wind];
}

export function getTieBreakOrder(windOrder: readonly (number | null)[], seat: number) {
  return expandWindOrder(windOrder)[seat] ?? seat;
}

export function expandWindOrder(windOrder: readonly (number | null)[]) {
  const explicitWinds = new Set(windOrder.filter((wind): wind is number => wind !== null));
  const remainingWinds = [0, 1, 2, 3].filter((wind) => !explicitWinds.has(wind));
  let remainingIndex = 0;

  return windOrder.map((wind) => {
    if (wind !== null && wind !== undefined) {
      return wind;
    }

    const nextWind = remainingWinds[remainingIndex] ?? 0;
    remainingIndex += 1;
    return nextWind;
  }) as [number, number, number, number];
}

export function cycleWindOrderAtSeat(
  windOrder: readonly (number | null)[],
  seat: number,
): [number | null, number | null, number | null, number | null] {
  const usedWinds = new Set(
    windOrder.filter((wind, index): wind is number => index !== seat && wind !== null),
  );
  const options = [null, 0, 1, 2, 3].filter((wind) => wind === null || !usedWinds.has(wind));
  const currentWind = windOrder[seat] ?? null;
  const currentIndex = Math.max(options.findIndex((wind) => wind === currentWind), 0);
  const nextWind = options[(currentIndex + 1) % options.length] ?? null;
  const nextOrder = [...windOrder] as [number | null, number | null, number | null, number | null];
  nextOrder[seat] = nextWind;
  return nextOrder;
}

function parseScore(value: string, maxScoreUnits: number) {
  const trimmed = value.trim();

  if (trimmed === '' || trimmed === '-') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= -maxScoreUnits && parsed <= maxScoreUnits ? parsed : Number.NaN;
}

export function isRowEmpty(row: GameRow) {
  return row.scores.every((score) => score.trim() === '');
}

export function resolveGameRow(row: GameRow, expectedTotal: number = TOTAL_POINTS): ResolvedGameRow {
  const expectedUnits = expectedTotal / SCORE_UNIT;
  const maxScoreUnits = Math.max(TOTAL_SCORE_UNITS, expectedUnits);
  const parsedScores = row.scores.map((score) => parseScore(score, maxScoreUnits));
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