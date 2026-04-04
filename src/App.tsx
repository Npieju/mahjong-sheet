import { useEffect, useMemo, useRef, useState } from 'react';
import { toBlob, toPng } from 'html-to-image';
import { buildCsv } from './lib/csv';
import { defaultState } from './lib/defaults';
import { createGameRow, cycleWindOrderAtSeat, getTieBreakOrder, getWindLabel, resolveGameRow, SCORE_UNIT, type GameRow } from './lib/sheet';
import { buildShareUrl, loadSavedState, readSharedState, saveState, serializeState } from './lib/state';
import { calculateGameResults, DEFAULT_RULE, formatDelta, getOkaPoints, getStandings, TRADITIONAL_RULE, type ScoringRule } from './lib/settlement';

function formatPointValue(value: number) {
  return new Intl.NumberFormat('ja-JP').format(value);
}

function formatPointInput(raw: string) {
  if (raw === '' || raw === '-') {
    return '-';
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    return raw;
  }

  return formatPointValue(parsed * SCORE_UNIT);
}

function App() {
  const initialState = readSharedState() ?? loadSavedState() ?? defaultState;
  const [playerNames, setPlayerNames] = useState(initialState.playerNames);
  const [games, setGames] = useState<GameRow[]>(initialState.games);
  const [rules, setRules] = useState<ScoringRule>(initialState.rules);
  const expectedTotal = rules.startPoint * 4;
  const [copied, setCopied] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const infoDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const settingsDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const exportImageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveState({ playerNames, games, rules });
  }, [games, playerNames, rules]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      for (const details of [infoDetailsRef.current, settingsDetailsRef.current]) {
        if (details?.open && !details.contains(event.target)) {
          details.open = false;
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (infoDetailsRef.current?.open) {
          infoDetailsRef.current.open = false;
        }

        if (settingsDetailsRef.current?.open) {
          settingsDetailsRef.current.open = false;
        }
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
        const resolution = resolveGameRow(row, expectedTotal);

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
            rules,
          ),
        };
      }),
    [expectedTotal, games, playerNames, rules],
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
  const shareUrl = useMemo(() => buildShareUrl(serializeState({ playerNames, games, rules })), [games, playerNames, rules]);
  const shareUrlPreview = useMemo(() => (shareUrl.length <= 10 ? shareUrl : `${shareUrl.slice(0, 10)}...`), [shareUrl]);
  const derivedOka = useMemo(() => getOkaPoints(rules), [rules]);
  const standings = useMemo(() => getStandings(playerNames, cumulativeTotals), [cumulativeTotals, playerNames]);
  const standingsBySeat = useMemo(() => new Map(standings.map((entry) => [entry.seat, entry])), [standings]);

  const updatePlayerName = (seat: number, value: string) => {
    setPlayerNames((current) => current.map((name, index) => (index === seat ? value : name)) as typeof current);
  };

  const updateRulePointUnits = (key: 'startPoint' | 'returnPoint', value: string) => {
    if (!/^\d{0,4}$/.test(value)) {
      return;
    }

    const nextValue = value === '' ? 0 : Number.parseInt(value, 10) * SCORE_UNIT;

    setRules((current) => {
      if (key === 'returnPoint') {
        if (current.mode !== 'traditional') {
          return current;
        }

        return { ...current, returnPoint: nextValue };
      }

      return { ...current, startPoint: nextValue };
    });
  };

  const updateUma = (index: number, value: string) => {
    const nextValue = Number.parseInt(value, 10);

    if (Number.isNaN(nextValue)) {
      return;
    }

    setRules((current) => {
      const nextUma = [...current.uma] as ScoringRule['uma'];
      nextUma[index] = nextValue;
      return { ...current, uma: nextUma };
    });
  };

  const resetRules = () => {
    setRules({ ...DEFAULT_RULE, uma: [...DEFAULT_RULE.uma] });
  };

  const applyPreset = (preset: 'mahjongSoul' | 'traditional') => {
    if (preset === 'traditional') {
      setRules({ ...TRADITIONAL_RULE, uma: [...TRADITIONAL_RULE.uma] });
      return;
    }

    resetRules();
  };

  const updateGameScore = (rowId: string, seat: number, value: string) => {
    if (!/^-?\d{0,4}$/.test(value)) {
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

  const recalculateGame = (rowId: string) => {
    setGames((currentGames) =>
      currentGames.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          scores: [...row.scores] as GameRow['scores'],
          windOrder: [...row.windOrder] as GameRow['windOrder'],
        };
      }),
    );
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

  const downloadImage = async () => {
    const node = exportImageRef.current;

    if (!node) {
      return;
    }

    setExportingImage(true);

    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const exportOptions = {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      };
      const blob = await toBlob(node, exportOptions);

      if (!blob) {
        return;
      }

      const file = new File([blob], 'mahjong-sheet.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'mahjong-sheet',
        });
        return;
      }

      const dataUrl = await toPng(node, exportOptions);
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = 'mahjong-sheet.png';
      anchor.click();
    } finally {
      setExportingImage(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>麻雀スコアシート</h1>
        <div className="topbar-actions">
          <details className="setting-details" ref={settingsDetailsRef}>
            <summary className="info-button" aria-label="計算設定">setting</summary>
            <div className="setting-popover">
              <div className="settings-grid">
                <label className="settings-field">
                  <span>持ち点</span>
                  <div className="settings-point-wrap">
                    <input
                      className="settings-point-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={String(rules.startPoint / SCORE_UNIT)}
                      onChange={(event) => updateRulePointUnits('startPoint', event.target.value)}
                    />
                    <span className="settings-point-suffix">00</span>
                  </div>
                </label>
                {rules.mode === 'traditional' ? (
                  <>
                    <label className="settings-field">
                      <span>返し点</span>
                      <div className="settings-point-wrap">
                        <input
                          className="settings-point-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={String(rules.returnPoint / SCORE_UNIT)}
                          onChange={(event) => updateRulePointUnits('returnPoint', event.target.value)}
                        />
                        <span className="settings-point-suffix">00</span>
                      </div>
                    </label>
                    <label className="settings-field">
                      <span>オカ</span>
                      <div className="settings-point-wrap">
                        <input className="settings-point-input" type="text" readOnly value={String(derivedOka / 1000)} />
                      </div>
                    </label>
                  </>
                ) : null}
                <label className="settings-field settings-field-wide">
                  <span>順位点</span>
                  <div className="uma-grid">
                    {rules.uma.map((value, index) => (
                      <input key={`uma-${index}`} type="number" value={value} onChange={(event) => updateUma(index, event.target.value)} />
                    ))}
                  </div>
                </label>
              </div>
              <div className="settings-actions">
                <button
                  type="button"
                  className={`preset-button ${rules.mode === 'mahjongSoul' ? 'active' : ''}`}
                  onClick={() => applyPreset('mahjongSoul')}
                >
                  雀魂ルール
                </button>
                <button
                  type="button"
                  className={`preset-button ${rules.mode === 'traditional' ? 'active' : ''}`}
                  onClick={() => applyPreset('traditional')}
                >
                  返しオカあり
                </button>
              </div>
            </div>
          </details>
          <details className="info-details" ref={infoDetailsRef}>
            <summary className="info-button" aria-label="使い方とルール">info</summary>
            <div className="info-popover">
              <p className="info-label">入力</p>
              <ul className="info-list">
                <li>100 点単位で入力。右の 00 は固定表示。</li>
                <li>符号込み 5 文字まで入力可能。例: 350, -100, 1200</li>
                <li>1 つだけ空欄なら 4 人目を自動補完。</li>
              </ul>
              <p className="info-label">現在の計算仕様</p>
              <ul className="info-list">
                <li>
                  {rules.mode === 'traditional'
                    ? `${rules.startPoint} 持ち ${rules.returnPoint} 返し。オカ ${derivedOka / 1000} をトップへ加算。`
                    : `雀魂ルール: (${rules.startPoint} を基準にした素点差) + 順位点。`}
                </li>
                <li>ウマ {rules.uma.map((value) => `${value >= 0 ? '+' : ''}${value}`).join(' / ')}。</li>
                <li>同点時は座順優先。必要なら - をクリックして各行の席順を指定。</li>
              </ul>
              <p className="info-label">参考</p>
              <ul className="info-list info-links">
                <li><a href="https://riichi.wiki/Mahjong_Soul#Rules" target="_blank" rel="noreferrer">riichi.wiki Mahjong Soul</a></li>
                <li><a href="https://riichi.wiki/Oka_and_uma#Procedure" target="_blank" rel="noreferrer">riichi.wiki Oka and uma</a></li>
                <li><a href="https://mahjong-item.jp/25000-30000/" target="_blank" rel="noreferrer">25000持ち30000返しの解説</a></li>
              </ul>
              <p className="info-label">共有</p>
              <ul className="info-list">
                <li>下の共有用URLをコピーすると、現在の入力内容と設定を共有可能。</li>
              </ul>
            </div>
          </details>
        </div>
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
                <th className="action-header" />
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
                      const windLabel = getWindLabel(game.row.windOrder, seat);
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
                              maxLength={5}
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
                            {windLabel === '-' ? null : (
                              <button
                                type="button"
                                className={`wind-button ${game.row.windOrder[seat] !== null ? 'active' : ''}`}
                                onClick={() => cycleWindOrder(game.row.id, seat)}
                                title={`${playerNames[seat]} の風を切り替える`}
                                aria-label={`この行の ${playerNames[seat]} の風を切り替える`}
                              >
                                {windLabel}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="remove-cell">
                      <div className="row-actions">
                        <button type="button" className="ghost-button" onClick={() => removeGame(game.row.id)}>
                          ×
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => recalculateGame(game.row.id)}
                          title="再計算"
                          aria-label={`この行を再計算する`}
                        >
                          ↻
                        </button>
                      </div>
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

        <div className="share-meta-row">
          <div className="share-meta" title={shareUrl}>
            <span className="share-label">共有用URL</span>
            <span className="share-preview">{shareUrlPreview}</span>
          </div>
        </div>

        <div className="bottom-actions">
          <button type="button" onClick={copyShareUrl}>{copied ? 'URLコピー済み' : 'URLコピー'}</button>
          <button type="button" onClick={downloadCsv}>CSV</button>
          <button type="button" onClick={downloadImage}>{exportingImage ? '画像出力中' : '画像出力'}</button>
        </div>

        <div className="export-canvas-wrap" aria-hidden="true">
          <div ref={exportImageRef} className="export-canvas">
            <div className="export-header">
              <div>
                <p className="export-eyebrow">mahjong-sheet</p>
                <h2>対局結果</h2>
                <p className="export-rule-summary">
                  {rules.mode === 'traditional'
                    ? `${rules.startPoint} 持ち ${rules.returnPoint} 返し / オカ ${derivedOka / 1000} / ウマ ${rules.uma.join(' / ')}`
                    : `雀魂ルール / 基準点 ${rules.startPoint} / 順位点 ${rules.uma.join(' / ')}`}
                </p>
              </div>
              <div className="export-count">完了 {completeGames.length} / 全{games.length}局</div>
            </div>

            <div className="export-standings">
              {standings.map((entry) => (
                <section key={`standing-${entry.seat}`} className={`export-standing-card rank-${entry.rank}`}>
                  <div className="export-standing-top">
                    <span className="export-rank-badge">{entry.rank}位</span>
                    <span className="export-standing-name">{entry.name}</span>
                  </div>
                  <div className={`export-standing-total ${entry.total >= 0 ? 'plus' : 'minus'}`}>{formatDelta(entry.total)}</div>
                </section>
              ))}
            </div>

            <div className="export-games">
              <div className="export-column-header-grid">
                {playerNames.map((name, seat) => (
                  <div key={`export-column-${seat}`} className="export-column-header-card">
                    <div className="export-column-name">{name}</div>
                    <div className="export-column-rank">{standingsBySeat.get(seat)?.rank}位</div>
                  </div>
                ))}
              </div>

              {evaluatedGames.map((game, index) => (
                <section key={`export-${game.row.id}`} className="export-game-card">
                  <div className="export-game-head">
                    <span className="export-game-index">#{index + 1}</span>
                    <span className="export-game-status">
                      {game.resolution.kind === 'complete'
                        ? '計算済み'
                        : game.resolution.kind === 'empty'
                          ? '未入力'
                          : game.resolution.kind === 'partial'
                            ? '補完待ち'
                            : game.resolution.kind === 'invalid'
                              ? '数値不正'
                              : `合計差 ${game.resolution.diff > 0 ? '+' : ''}${game.resolution.diff}`}
                    </span>
                  </div>
                  <div className="export-game-grid">
                    {playerNames.map((_, seat) => {
                      const result = game.results?.find((entry) => entry.seat === seat) ?? null;
                      const rawPoints =
                        game.resolution.kind === 'complete'
                          ? formatPointValue(game.resolution.scores[seat])
                          : formatPointInput(game.row.scores[seat]);

                      return (
                        <div key={`export-${game.row.id}-${seat}`} className="export-seat-card">
                          <div className="export-seat-raw">{rawPoints}</div>
                          <div className={`export-seat-result ${result ? (result.total >= 0 ? 'plus' : 'minus') : 'muted'}`}>
                            {result ? formatDelta(result.total) : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
