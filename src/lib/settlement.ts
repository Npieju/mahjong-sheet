export type MahjongSoulPlayer = {
  seat: number;
  name: string;
  score: number;
  tieBreakOrder?: number;
};

export type MahjongSoulRule = {
  startPoint: number;
  returnPoint: number;
  uma: [number, number, number, number];
  okaPoints: number;
};

export type MahjongSoulResult = MahjongSoulPlayer & {
  rank: number;
  roundedBase: number;
  uma: number;
  total: number;
};

export type Standing = {
  seat: number;
  name: string;
  rank: number;
  total: number;
};

export const MAHJONG_SOUL_RULE: MahjongSoulRule = {
  startPoint: 25000,
  returnPoint: 30000,
  uma: [15, 5, -5, -15],
  okaPoints: 20000,
};

export function roundHalfDown(value: number) {
  const absolute = Math.abs(value);
  const base = Math.floor(absolute);
  const fraction = absolute - base;
  const rounded = fraction > 0.5 ? base + 1 : base;

  return value < 0 ? -rounded : rounded;
}

export function getPlacementOrder(players: MahjongSoulPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (left.tieBreakOrder ?? left.seat) - (right.tieBreakOrder ?? right.seat);
  });
}

export function calculateGameResults(players: MahjongSoulPlayer[], rules: MahjongSoulRule = MAHJONG_SOUL_RULE) {
  const placements = getPlacementOrder(players);
  const bySeat = new Map<number, MahjongSoulResult>();

  for (const [index, player] of placements.entries()) {
    const rank = index + 1;
    const oka = index === 0 ? rules.okaPoints : 0;
    const roundedBase = roundHalfDown((player.score + oka - rules.returnPoint) / 1000);
    const uma = rules.uma[index] ?? 0;

    bySeat.set(player.seat, {
      ...player,
      rank,
      roundedBase,
      uma,
      total: roundedBase + uma,
    });
  }

  const results = [...bySeat.values()].sort((left, right) => left.seat - right.seat);
  const diff = results.reduce((sum, result) => sum + result.total, 0);

  if (diff !== 0) {
    const winner = placements[0];
    const winnerResult = bySeat.get(winner.seat);

    if (winnerResult) {
      winnerResult.total -= diff;
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
  return `${value >= 0 ? '+' : ''}${value}`;
}