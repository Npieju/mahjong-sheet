export type MahjongSoulPlayer = {
  seat: number;
  name: string;
  score: number;
  tieBreakOrder?: number;
};

export type ScoringRule = {
  startPoint: number;
  returnPoint: number;
  uma: [number, number, number, number];
  okaPoints: number;
};

export type MahjongSoulRule = ScoringRule;

export type MahjongSoulResult = MahjongSoulPlayer & {
  rank: number;
  baseScore: number;
  uma: number;
  total: number;
};

export type Standing = {
  seat: number;
  name: string;
  rank: number;
  total: number;
};

export const DEFAULT_RULE: ScoringRule = {
  startPoint: 25000,
  returnPoint: 25000,
  uma: [15, 5, -5, -15],
  okaPoints: 0,
};

export const MAHJONG_SOUL_RULE = DEFAULT_RULE;

function toInteger(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

export function normalizeRule(value: unknown): ScoringRule {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_RULE;
  }

  const candidate = value as Partial<ScoringRule>;
  const startPoint = toInteger(candidate.startPoint);
  const returnPoint = toInteger(candidate.returnPoint);
  const okaPoints = toInteger(candidate.okaPoints);
  const uma = Array.isArray(candidate.uma) && candidate.uma.length === 4
    ? candidate.uma.map((entry) => toInteger(entry) ?? 0)
    : null;

  if (startPoint === null || returnPoint === null || okaPoints === null || uma === null) {
    return DEFAULT_RULE;
  }

  return {
    startPoint,
    returnPoint,
    okaPoints,
    uma: uma as [number, number, number, number],
  };
}

export function isDefaultRule(rule: ScoringRule) {
  return rule.startPoint === DEFAULT_RULE.startPoint
    && rule.returnPoint === DEFAULT_RULE.returnPoint
    && rule.okaPoints === DEFAULT_RULE.okaPoints
    && rule.uma.every((value, index) => value === DEFAULT_RULE.uma[index]);
}

function roundToTenths(value: number) {
  return Math.round(value * 10) / 10;
}

export function getPlacementOrder(players: MahjongSoulPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (left.tieBreakOrder ?? left.seat) - (right.tieBreakOrder ?? right.seat);
  });
}

export function calculateGameResults(players: MahjongSoulPlayer[], rules: ScoringRule = DEFAULT_RULE) {
  const placements = getPlacementOrder(players);
  const bySeat = new Map<number, MahjongSoulResult>();

  for (const [index, player] of placements.entries()) {
    const rank = index + 1;
    const oka = index === 0 ? rules.okaPoints : 0;
    const baseScore = roundToTenths((player.score + oka - rules.returnPoint) / 1000);
    const uma = rules.uma[index] ?? 0;

    bySeat.set(player.seat, {
      ...player,
      rank,
      baseScore,
      uma,
      total: roundToTenths(baseScore + uma),
    });
  }

  const results = [...bySeat.values()].sort((left, right) => left.seat - right.seat);
  const diff = roundToTenths(results.reduce((sum, result) => sum + result.total, 0));

  if (diff !== 0) {
    const winner = placements[0];
    const winnerResult = bySeat.get(winner.seat);

    if (winnerResult) {
      winnerResult.total = roundToTenths(winnerResult.total - diff);
    }
  }

  return [...bySeat.values()].sort((left, right) => left.seat - right.seat);
}

export function getStandings(playerNames: readonly string[], totals: readonly number[]) {
  return [...totals]
    .map((total, seat) => ({
      seat,
      name: playerNames[seat],
      total,
    }))
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }

      return left.seat - right.seat;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })) as Standing[];
}

export function formatDelta(value: number) {
  const rounded = roundToTenths(value);
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}`;
}