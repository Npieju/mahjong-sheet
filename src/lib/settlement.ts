export type MahjongSoulPlayer = {
  seat: number;
  name: string;
  score: number;
  tieBreakOrder?: number;
};

export type MahjongSoulRule = {
  mode: 'mahjongSoul';
  startPoint: number;
  uma: [number, number, number, number];
};

export type TraditionalRule = {
  mode: 'traditional';
  startPoint: number;
  returnPoint: number;
  uma: [number, number, number, number];
};

export type ScoringRule = MahjongSoulRule | TraditionalRule;

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

export const DEFAULT_RULE: MahjongSoulRule = {
  mode: 'mahjongSoul',
  startPoint: 25000,
  uma: [15, 5, -5, -15],
};

export const TRADITIONAL_RULE: TraditionalRule = {
  mode: 'traditional',
  startPoint: 25000,
  returnPoint: 30000,
  uma: [15, 5, -5, -15],
};

export const MAHJONG_SOUL_RULE = DEFAULT_RULE;

function toInteger(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function rulesMatch(left: ScoringRule, right: ScoringRule) {
  if (left.mode !== right.mode || left.startPoint !== right.startPoint) {
    return false;
  }

  if (left.mode === 'traditional' && right.mode === 'traditional' && left.returnPoint !== right.returnPoint) {
    return false;
  }

  return left.uma.every((value, index) => value === right.uma[index]);
}

export function normalizeRule(value: unknown): ScoringRule {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_RULE;
  }

  const candidate = value as Partial<ScoringRule> & { returnPoint?: unknown; okaPoints?: unknown; mode?: unknown };
  const startPoint = toInteger(candidate.startPoint);
  const uma = Array.isArray(candidate.uma) && candidate.uma.length === 4
    ? candidate.uma.map((entry) => toInteger(entry) ?? 0)
    : null;

  if (startPoint === null || uma === null) {
    return DEFAULT_RULE;
  }

  const returnPoint = toInteger(candidate.returnPoint);

  if (candidate.mode === 'traditional' && returnPoint !== null) {
    return {
      mode: 'traditional',
      startPoint,
      returnPoint,
      uma: uma as [number, number, number, number],
    };
  }

  if (candidate.mode === 'mahjongSoul') {
    return {
      mode: 'mahjongSoul',
      startPoint,
      uma: uma as [number, number, number, number],
    };
  }

  if (returnPoint !== null || toInteger(candidate.okaPoints) !== null) {
    return {
      mode: 'traditional',
      startPoint,
      returnPoint: returnPoint ?? TRADITIONAL_RULE.returnPoint,
      uma: uma as [number, number, number, number],
    };
  }

  return {
    mode: 'mahjongSoul',
    startPoint,
    uma: uma as [number, number, number, number],
  };
}

export function isDefaultRule(rule: ScoringRule) {
  return rulesMatch(rule, DEFAULT_RULE);
}

function roundToTenths(value: number) {
  return Math.round(value * 10) / 10;
}

export function roundHalfDown(value: number) {
  const absolute = Math.abs(value);
  const base = Math.floor(absolute);
  const fraction = absolute - base;
  const rounded = fraction > 0.5 ? base + 1 : base;

  return value < 0 ? -rounded : rounded;
}

export function getOkaPoints(rule: ScoringRule) {
  return rule.mode === 'traditional' ? Math.max(0, (rule.returnPoint - rule.startPoint) * 4) : 0;
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
  const normalizeResultValue = (value: number) => (rules.mode === 'traditional' ? value : roundToTenths(value));

  for (const [index, player] of placements.entries()) {
    const rank = index + 1;
    const baseScore =
      rules.mode === 'traditional'
        ? roundHalfDown((player.score + (index === 0 ? getOkaPoints(rules) : 0) - rules.returnPoint) / 1000)
        : roundToTenths((player.score - rules.startPoint) / 1000);
    const uma = rules.uma[index] ?? 0;

    bySeat.set(player.seat, {
      ...player,
      rank,
      baseScore,
      uma,
      total: normalizeResultValue(baseScore + uma),
    });
  }

  const results = [...bySeat.values()].sort((left, right) => left.seat - right.seat);
  const diff = normalizeResultValue(results.reduce((sum, result) => sum + result.total, 0));

  if (diff !== 0) {
    const winner = placements[0];
    const winnerResult = bySeat.get(winner.seat);

    if (winnerResult) {
      winnerResult.total = normalizeResultValue(winnerResult.total - diff);
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
  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${rounded >= 0 ? '+' : ''}${formatted}`;
}
