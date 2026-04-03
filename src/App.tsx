import { useEffect, useMemo, useState } from 'react';
import { buildCsv } from './lib/csv';
import { defaultState } from './lib/defaults';
import { createGameRow, isRowEmpty, resolveGameRow, SCORE_UNIT, TOTAL_POINTS, type GameRow } from './lib/sheet';
import { buildShareUrl, loadSavedState, readSharedState, saveState, serializeState } from './lib/state';
import { calculateGameResults, formatDelta } from './lib/settlement';

function App() {
  const initialState = readSharedState() ?? loadSavedState() ?? defaultState;
  const [playerNames, setPlayerNames] = useState(initialState.playerNames);
  const [games, setGames] = useState<GameRow[]>(initialState.games);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveState({ playerNames, games });
  }, [games, playerNames]);

  const evaluatedGames = useMemo(
    () =>
      games.map((row) => {
        const resolution = resolveGameRow(row, TOTAL_POINTS);

        if (resolution.kind !== 'complete') {
          return { row, resolution, results: null };
        }

        return {
          row,
          resolution,
          results: calculateGameResults(
            resolution.scores.map((score, seat) => ({
              seat,
              name: playerNames[seat],
              score,
            })),
          ),
        };
      }),
    [games, playerNames],
  );

  const completeGames = evaluatedGames.filter((game) => game.results !== null);
  const cumulativeTotals = useMemo(() => {
    const totals = [0, 0, 0, 0];

    for (const game of completeGames) {
      for (const result of game.results ?? []) {
        totals[result.seat] += result.total;
      }
    }

    return totals as [number, number, number, number];
  }, [completeGames]);
  const shareUrl = useMemo(() => buildShareUrl(serializeState({ playerNames, games })), [games, playerNames]);

  const updatePlayerName = (seat: number, value: string) => {
    setPlayerNames((current) => current.map((name, index) => (index === seat ? value : name)) as typeof current);
  };

  const updateGameScore = (rowId: string, seat: number, value: string) => {
    if (!/^-?\d{0,3}$/.test(value)) {
      return;
    }

    setGames((currentGames) =>
      currentGames.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const scores = [...row.scores] as GameRow['scores'];
        scores[seat] = value;
        return { ...row, scores };
      }),
    );
  };

  const addGame = () => {
    setGames((currentGames) => [...currentGames, createGameRow()]);
  };

  const removeGame = (rowId: string) => {
    setGames((currentGames) => {
      const nextGames = currentGames.filter((row) => row.id !== rowId);
      return nextGames.length > 0 ? nextGames : [createGameRow()];
    });
  };

  const downloadCsv = () => {
    const blob = new Blob([buildCsv(playerNames, evaluatedGames, cumulativeTotals)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mahjong-sheet.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>麻雀スコアシート</h1>
        <details className="info-details">
          <summary className="info-button" aria-label="使い方とルール">i</summary>
          <div className="info-popover">
            <p>100点単位、符号込み4文字入力。右の 00 は固定。</p>
            <p>空欄を 1 つだけ残すと 4 人目を自動補完。</p>
            <p>雀魂式 4麻。25000持ち、30000返し、オカ20、ウマ +15 +5 -5 -15、同点は座順優先。</p>
            <p>状態: 未=未入力、補=補完待ち、数=数値不正、差=合計不一致、自=自動補完。</p>
            <p>URL と localStorage に保存。</p>
            {games.every((row) => isRowEmpty(row)) ? <p>まず 1 行入れれば動く。</p> : null}
          </div>
        </details>
      </header>

      <section className="table-panel">
        <div className="toolbar">
          <button type="button" onClick={addGame}>行を追加</button>
          <button type="button" onClick={downloadCsv}>CSV</button>
          <button type="button" onClick={copyShareUrl}>{copied ? 'URLコピー済み' : 'URLをコピー'}</button>
        </div>

        <div className="table-wrap">
          <table className="score-table">
            <colgroup>
              <col className="col-index" />
              <col className="col-score" />
              <col className="col-score" />
              <col className="col-score" />
              <col className="col-score" />
              <col className="col-status" />
              <col className="col-remove" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                {playerNames.map((name, seat) => (
                  <th key={`name-${seat}`}>
                    <input
                      className="name-input"
                      type="text"
                      value={name}
                      onChange={(event) => updatePlayerName(seat, event.target.value)}
                    />
                  </th>
                ))}
                <th>状</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {evaluatedGames.map((game, gameIndex) => {
                const autoFilledSeat = game.resolution.kind === 'complete' ? game.resolution.autoFilledSeat : null;
                const rowStatus =
                  game.resolution.kind === 'empty'
                    ? { short: '未', long: '未入力' }
                    : game.resolution.kind === 'partial'
                      ? { short: '補', long: '3人入力で補完待ち' }
                      : game.resolution.kind === 'invalid'
                        ? { short: '数', long: '数値不正' }
                        : game.resolution.kind === 'mismatch'
                          ? { short: '差', long: `合計差 ${game.resolution.diff > 0 ? '+' : ''}${game.resolution.diff}` }
                          : autoFilledSeat === null
                            ? { short: 'OK', long: '計算可' }
                            : { short: '自', long: '自動補完' };

                return (
                  <tr key={game.row.id} className={game.resolution.kind === 'mismatch' ? 'row-warn' : undefined}>
                    <th scope="row">{gameIndex + 1}</th>
                    {game.row.scores.map((score, seat) => {
                      const result = game.results?.find((entry) => entry.seat === seat) ?? null;
                      const isAuto = autoFilledSeat === seat;
                      const displayValue = isAuto && game.resolution.kind === 'complete'
                        ? String(game.resolution.scores[seat] / SCORE_UNIT)
                        : score;

                      return (
                        <td key={`${game.row.id}-${seat}`} className={isAuto ? 'auto-cell' : undefined}>
                          <div className="score-input-wrap">
                            <input
                              className="score-input"
                              type="text"
                              inputMode="text"
                              maxLength={4}
                              value={displayValue}
                              disabled={isAuto}
                              onChange={(event) => updateGameScore(game.row.id, seat, event.target.value)}
                            />
                            <span className="score-suffix">00</span>
                          </div>
                          {result ? (
                            <div className={`result-chip ${result.total >= 0 ? 'plus' : 'minus'}`}>
                              {formatDelta(result.total)}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="status-cell" title={rowStatus.long}>{rowStatus.short}</td>
                    <td className="remove-cell">
                      <button type="button" className="ghost-button" onClick={() => removeGame(game.row.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>通算</th>
                {cumulativeTotals.map((total, seat) => (
                  <td key={`total-${seat}`}>
                    <div className={`result-chip ${total >= 0 ? 'plus' : 'minus'}`}>{formatDelta(total)}</div>
                  </td>
                ))}
                <td className="status-cell">{completeGames.length}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <input className="share-input" type="text" readOnly value={shareUrl} />
      </section>
    </main>
  );
}

export default App;
