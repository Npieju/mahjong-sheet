import type { MahjongSoulResult } from './settlement';
import type { ResolvedGameRow } from './sheet';

type EvaluatedGame = {
  resolution: ResolvedGameRow;
  results: MahjongSoulResult[] | null;
};

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function buildCsv(playerNames: readonly string[], games: readonly EvaluatedGame[], totals: readonly number[]) {
  const header = ['game'];

  for (const name of playerNames) {
    header.push(`${name}_raw`);
    header.push(`${name}_result`);
  }

  header.push('status');

  const rows = games.map((game, index) => {
    const row: Array<string | number> = [index + 1];

    for (let seat = 0; seat < playerNames.length; seat += 1) {
      if (game.resolution.kind === 'complete') {
        const result = game.results?.find((entry) => entry.seat === seat);
        row.push(game.resolution.scores[seat]);
        row.push(result?.total ?? '');
      } else {
        row.push('');
        row.push('');
      }
    }

    row.push(game.resolution.kind);
    return row;
  });

  const totalRow: Array<string | number> = ['total'];
  for (let seat = 0; seat < playerNames.length; seat += 1) {
    totalRow.push('');
    totalRow.push(totals[seat]);
  }
  totalRow.push('');

  return [header, ...rows, totalRow].map((row) => row.map(escapeCsv).join(',')).join('\n');
}