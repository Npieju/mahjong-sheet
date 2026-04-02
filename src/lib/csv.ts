import type { PlayerResult } from './settlement';

export function buildCsv(results: PlayerResult[]) {
  const header = ['rank', 'name', 'score', 'baseDelta', 'placementDelta', 'okaDelta', 'settlement'];
  const rows = results.map((result) => [
    result.rank,
    result.name,
    result.score,
    result.baseDelta.toFixed(1),
    result.placementDelta.toFixed(1),
    result.okaDelta.toFixed(1),
    result.settlement.toFixed(1),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}