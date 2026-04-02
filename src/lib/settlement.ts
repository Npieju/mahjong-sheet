export type PlayerInput = {
  id: string;
  name: string;
  score: number;
};

export type RuleConfig = {
  startPoint: number;
  returnPoint: number;
  placementBonus: [number, number, number, number];
  applyOka: boolean;
};

export type PlayerResult = PlayerInput & {
  rank: number;
  baseDelta: number;
  placementDelta: number;
  okaDelta: number;
  settlement: number;
};

const toPointUnit = (score: number, returnPoint: number) => (score - returnPoint) / 1000;

export const calculateOka = (startPoint: number, returnPoint: number) =>
  ((returnPoint - startPoint) * 4) / 1000;

export function rankPlayers(players: PlayerInput[]) {
  return [...players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.id.localeCompare(right.id);
  });
}

export function calculateSettlement(players: PlayerInput[], rules: RuleConfig): PlayerResult[] {
  const ranked = rankPlayers(players);
  const oka = rules.applyOka ? calculateOka(rules.startPoint, rules.returnPoint) : 0;

  return ranked.map((player, index) => {
    const baseDelta = toPointUnit(player.score, rules.returnPoint);
    const placementDelta = rules.placementBonus[index] ?? 0;
    const okaDelta = index === 0 ? oka : 0;
    const settlement = baseDelta + placementDelta + okaDelta;

    return {
      ...player,
      rank: index + 1,
      baseDelta,
      placementDelta,
      okaDelta,
      settlement,
    };
  });
}

export function calculateScoreTotal(players: PlayerInput[]) {
  return players.reduce((sum, player) => sum + player.score, 0);
}

export function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}