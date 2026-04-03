import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCsv } from './lib/csv';
import { defaultState } from './lib/defaults';
import { createGameRow, cycleWindOrderAtSeat, getTieBreakOrder, getWindLabel, resolveGameRow, SCORE_UNIT, TOTAL_POINTS, type GameRow } from './lib/sheet';
import { buildShareUrl, loadSavedState, readSharedState, saveState, serializeState } from './lib/state';
import { calculateGameResults, formatDelta } from './lib/settlement';

function App() {
  const initialState = readSharedState() ?? loadSavedState() ?? defaultState;
  const [playerNames, setPlayerNames] = useState(initialState.playerNames);
  const [games, setGames] = useState<GameRow[]>(initialState.games);
  const [copied, setCopied] = useState(false);
  const infoDetailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    saveState({ playerNames, games });
  }, [games, playerNames]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const infoDetails = infoDetailsRef.current;

      if (!infoDetails?.open) {
        return;
      }

      if (event.target instanceof Node && !infoDetails.contains(event.target)) {
        infoDetails.open = false;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && infoDetailsRef.current?.open) {
        infoDetailsRef.current.open = false;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
              tieBreakOrder: getTieBreakOrder(row.windOrder, seat),
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

  const cycleWindOrder = (rowId: string, seat: number) => {
    setGames((currentGames) =>
      currentGames.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return { ...row, windOrder: cycleWindOrderAtSeat(row.windOrder, seat) };
      }),
    );
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
        <details className="info-details" ref={infoDetailsRef}>
          <summary className="info-button" aria-label="使い方とルール">info</summary>
          <div className="info-popover">
            <p className="info-label">入力</p>
            <ul className="info-list">
              <li>100 点単位で入力。右の 00 は固定表示。</li>
              <li>符号込み 4 文字まで入力可能。例: 350, -100</li>
              <li>1 つだけ空欄なら 4 人目を自動補完。</li>
            </ul>
            <p className="info-label">計算仕様</p>
            <ul className="info-list">
              <li>4 麻の雀魂式。</li>
              <li>25000 持ち、30000 返し。</li>
              <li>オカ 20、ウマ +15 / +5 / -5 / -15。</li>
              <li>同点時は座順優先。必要なら - をクリックして各行の席順を指定。</li>
            </ul>
            <p className="info-label">保存</p>
            <ul className="info-list">
              <li>表の内容は URL と localStorage に保存。</li>
            </ul>
          </div>
        </details>
      </header>

      <section className="table-panel">
        <div className="table-wrap">
          <table className="score-table">
            <colgroup>
              <col className="col-index" />
              <col className="col-score" />
              <col className="col-score" />
              <col className="col-score" />
              <col className="col-score" />
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
                      ? '3人入力で補完待ち'
                      : game.resolution.kind === 'invalid'
                        ? '数値不正'
                        : game.resolution.kind === 'mismatch'
                          ? `合計差 ${game.resolution.diff > 0 ? '+' : ''}${game.resolution.diff}`
                          : autoFilledSeat === null
                            ? '計算可'
                            : '自動補完';

                return (
                  <tr
                    key={game.row.id}
                    className={game.resolution.kind === 'mismatch' ? 'row-warn' : undefined}
                    title={rowStatus}
                  >
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
                          <div className="cell-meta-row">
                            {result ? (
                              <div className={`result-chip ${result.total >= 0 ? 'plus' : 'minus'}`}>
                                {formatDelta(result.total)}
                              </div>
                            ) : (
                              <div className="result-chip-placeholder" />
                            )}
                            <button
                              type="button"
                              className={`wind-button ${game.row.windOrder[seat] !== null ? 'active' : ''}`}
                              onClick={() => cycleWindOrder(game.row.id, seat)}
                              title={`${playerNames[seat]} の風を切り替える`}
                              aria-label={`この行の ${playerNames[seat]} の風を切り替える`}
                            >
                              {getWindLabel(game.row.windOrder, seat)}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="remove-cell">
                      <button type="button" className="ghost-button" onClick={() => removeGame(game.row.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="add-row">
                <th scope="row">{games.length + 1}</th>
                <td colSpan={5}>
                  <button type="button" className="inline-add-button" onClick={addGame}>行追加</button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>通算</th>
                {cumulativeTotals.map((total, seat) => (
                  <td key={`total-${seat}`}>
                    <div className={`result-chip ${total >= 0 ? 'plus' : 'minus'}`}>{formatDelta(total)}</div>
                  </td>
                ))}
                <td className="remove-cell total-count-cell">{completeGames.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <input className="share-input" type="text" readOnly value={shareUrl} />

        <div className="bottom-actions">
          <button type="button" onClick={downloadCsv}>CSV</button>
          <button type="button" onClick={copyShareUrl}>{copied ? 'URLコピー済み' : 'URLコピー'}</button>
        </div>
      </section>
    </main>
  );
}

export default App;
