import { useEffect, useMemo, useState } from 'react';
import { buildCsv } from './lib/csv';
import { defaultState } from './lib/defaults';
import { buildShareUrl, loadSavedState, readSharedState, saveState, serializeState } from './lib/state';
import { calculateScoreTotal, calculateSettlement, formatDelta, type PlayerInput } from './lib/settlement';

function App() {
  const sharedState = readSharedState();
  const savedState = loadSavedState();

  const [players, setPlayers] = useState<PlayerInput[]>(sharedState?.players ?? savedState?.players ?? defaultState.players);
  const [rules, setRules] = useState(sharedState?.rules ?? savedState?.rules ?? defaultState.rules);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveState({ players, rules });
  }, [players, rules]);

  const results = useMemo(() => calculateSettlement(players, rules), [players, rules]);
  const totalScore = useMemo(() => calculateScoreTotal(players), [players]);
  const expectedTotal = rules.startPoint * 4;
  const shareUrl = useMemo(() => buildShareUrl(serializeState({ players, rules })), [players, rules]);

  const updatePlayer = (playerId: string, field: 'name' | 'score', value: string) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        if (player.id !== playerId) {
          return player;
        }

        if (field === 'score') {
          const nextScore = Number(value);
          return { ...player, score: Number.isFinite(nextScore) ? nextScore : 0 };
        }

        return { ...player, name: value };
      }),
    );
  };

  const updatePlacementBonus = (index: number, value: string) => {
    const nextValue = Number(value);
    setRules((currentRules) => {
      const placementBonus = [...currentRules.placementBonus] as [number, number, number, number];
      placementBonus[index] = Number.isFinite(nextValue) ? nextValue : 0;
      return { ...currentRules, placementBonus };
    });
  };

  const downloadCsv = () => {
    const blob = new Blob([buildCsv(results)], { type: 'text/csv;charset=utf-8' });
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
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Mahjong Score Sheet</p>
        <h1>4人麻雀の精算を、静的アプリで素早く。</h1>
        <p className="lead">
          25000点持ち、30000点返し、順位点、CSV 出力、URL 共有をひとつの静的ページにまとめた
          スコアシートです。
        </p>
      </section>

      <section className="dashboard-grid">
        <section className="panel input-panel">
          <div className="panel-header">
            <h2>入力</h2>
            <span>同点時は入力順で順位決定</span>
          </div>

          <div className="player-grid">
            {players.map((player, index) => (
              <article className="player-card" key={player.id}>
                <label>
                  <span>プレイヤー {index + 1}</span>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(event) => updatePlayer(player.id, 'name', event.target.value)}
                  />
                </label>
                <label>
                  <span>素点</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={player.score}
                    onChange={(event) => updatePlayer(player.id, 'score', event.target.value)}
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="rules-grid">
            <label>
              <span>持ち点</span>
              <input
                type="number"
                value={rules.startPoint}
                onChange={(event) =>
                  setRules((currentRules) => ({ ...currentRules, startPoint: Number(event.target.value) || 0 }))
                }
              />
            </label>
            <label>
              <span>返し点</span>
              <input
                type="number"
                value={rules.returnPoint}
                onChange={(event) =>
                  setRules((currentRules) => ({ ...currentRules, returnPoint: Number(event.target.value) || 0 }))
                }
              />
            </label>
            <label className="toggle-row">
              <span>オカを適用</span>
              <input
                type="checkbox"
                checked={rules.applyOka}
                onChange={(event) =>
                  setRules((currentRules) => ({ ...currentRules, applyOka: event.target.checked }))
                }
              />
            </label>
          </div>

          <div className="bonus-grid">
            {rules.placementBonus.map((bonus, index) => (
              <label key={`bonus-${index}`}>
                <span>{index + 1}位 順位点</span>
                <input
                  type="number"
                  step="0.1"
                  value={bonus}
                  onChange={(event) => updatePlacementBonus(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel results-panel">
          <div className="panel-header">
            <h2>精算結果</h2>
            <span>{totalScore.toLocaleString()} / {expectedTotal.toLocaleString()} 点</span>
          </div>

          <div className={`status-card ${totalScore === expectedTotal ? 'ok' : 'warn'}`}>
            {totalScore === expectedTotal
              ? '点数合計は期待値どおりです。'
              : `点数合計が ${expectedTotal.toLocaleString()} 点から ${(totalScore - expectedTotal).toLocaleString()} 点ずれています。`}
          </div>

          <table>
            <thead>
              <tr>
                <th>順位</th>
                <th>名前</th>
                <th>素点</th>
                <th>返し差</th>
                <th>順位点</th>
                <th>オカ</th>
                <th>精算</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>{result.rank}</td>
                  <td>{result.name}</td>
                  <td>{result.score.toLocaleString()}</td>
                  <td>{formatDelta(result.baseDelta)}</td>
                  <td>{formatDelta(result.placementDelta)}</td>
                  <td>{formatDelta(result.okaDelta)}</td>
                  <td className="settlement-cell">{formatDelta(result.settlement)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="action-row">
            <button type="button" onClick={downloadCsv}>CSV を保存</button>
            <button type="button" onClick={copyShareUrl}>{copied ? 'コピー済み' : '共有 URL をコピー'}</button>
          </div>

          <label className="share-box">
            <span>共有 URL</span>
            <textarea value={shareUrl} readOnly rows={4} />
          </label>
        </section>
      </section>
    </main>
  );
}

export default App;
