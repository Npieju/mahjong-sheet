const players = [
  { name: 'Player 1', score: 35000 },
  { name: 'Player 2', score: 28000 },
  { name: 'Player 3', score: 22000 },
  { name: 'Player 4', score: 15000 },
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Mahjong Score Sheet</p>
        <h1>4人麻雀の精算を、静的アプリで素早く。</h1>
        <p className="lead">
          25000点持ち、30000点返し、順位点付きの精算フローを GitHub Pages 上で動かす前提の
          プロジェクトです。
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>初期データ</h2>
          <span>実装開始前のプレースホルダー</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>名前</th>
              <th>素点</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.name}>
                <td>{index + 1}</td>
                <td>{player.name}</td>
                <td>{player.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default App;
