import { useEffect, useMemo, useState } from 'react';
import { buildCsv } from './lib/csv';
import { defaultState } from './lib/defaults';
import { createGameRow, isRowEmpty, resolveGameRow, SCORE_UNIT, TOTAL_POINTS, type GameRow } from './lib/sheet';
import { buildShareUrl, loadSavedState, readSharedState, saveState, serializeState } from './lib/state';
import { calculateGameResults, formatDelta, MAHJONG_SOUL_RULE } from './lib/settlement';

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
        <p>100点単位 / 符号付き3桁入力</p>
      </header>

      <section className="table-panel">
        <div className="toolbar">
          <button type="button" onClick={addGame}>行を追加</button>
          <button type="button" onClick={downloadCsv}>CSV</button>
          <button type="button" onClick={copyShareUrl}>{copied ? 'URLコピー済み' : 'URLをコピー'}</button>
        </div>

        <div className="table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th>Game</th>
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
                <th>状態</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {evaluatedGames.map((game, gameIndex) => {
                const autoFilledSeat = game.resolution.kind === 'complete' ? game.resolution.autoFilledSeat : null;
                const rowStatus =
                  game.resolution.kind === 'empty'
                    ? '未入力'
                    : game.resolution.kind === 'partial'
                      ? '3人入力で補完'
                      : game.resolution.kind === 'invalid'
                        ? '数値のみ'
                        : game.resolution.kind === 'mismatch'
                          ? `合計 ${game.resolution.diff > 0 ? '+' : ''}${game.resolution.diff}`
                          : autoFilledSeat === null
                            ? 'OK'
                            : '自動補完';

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
                    <td className="status-cell">{rowStatus}</td>
                    <td className="remove-cell">
                      <button type="button" className="ghost-button" onClick={() => removeGame(game.row.id)}>
                        削除
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
                <td>{completeGames.length}局</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="notes-row">
          <span>符号付き3桁で入力、右の 00 は固定です。</span>
          <span>空欄を 1 つだけ残すと 4 人目を自動補完します。</span>
          <span>URL と localStorage に保存します。</span>
        </div>

        <input className="share-input" type="text" readOnly value={shareUrl} />
      </section>

      <section className="rule-panel">
        <div>持ち点 {MAHJONG_SOUL_RULE.startPoint.toLocaleString()}</div>
        <div>返し点 {MAHJONG_SOUL_RULE.returnPoint.toLocaleString()}</div>
        <div>オカ {(MAHJONG_SOUL_RULE.okaPoints / 1000).toFixed(0)}</div>
        <div>合計 {TOTAL_POINTS.toLocaleString()} 点</div>
      </section>

      <section className="empty-hint">{games.every((row) => isRowEmpty(row)) ? 'まず 1 行入れれば動きます。' : null}</section>
    </main>
  );
}

export default App;
