const OPENINGS = [
  {
    id: 'caro-kann',
    name: 'Caro–Kann Defence',
    eco: 'B12',
    complexity: 'intermediate',
    position: 'caro-kann',
    moves: '1.e4 c6',
    stats: [31, 39, 30],
  },
  {
    id: 'sicilian',
    name: 'Sicilian Defence',
    eco: 'B20',
    complexity: 'advanced',
    position: 'sicilian',
    moves: '1.e4 c5',
    stats: [33, 30, 37],
  },
  {
    id: 'london',
    name: 'London System',
    eco: 'A48',
    complexity: 'beginner',
    position: 'london',
    moves: '1.d4 d5 2.Bf4',
    stats: [36, 42, 22],
  },
  {
    id: 'queens-gambit',
    name: 'Queen\u2019s Gambit',
    eco: 'D06',
    complexity: 'intermediate',
    position: 'queens-gambit',
    moves: '1.d4 d5 2.c4',
    stats: [37, 35, 28],
  },
  {
    id: 'french',
    name: 'French Defence',
    eco: 'C00',
    complexity: 'intermediate',
    position: 'french',
    moves: '1.e4 e6',
    stats: [34, 33, 33],
  },
  {
    id: 'kings-indian',
    name: 'King\u2019s Indian Defence',
    eco: 'E60',
    complexity: 'advanced',
    position: 'kings-indian',
    moves: '1.d4 Nf6 2.c4 g6',
    stats: [37, 29, 34],
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C60',
    complexity: 'advanced',
    position: 'ruy-lopez',
    moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
    stats: [39, 33, 28],
  },
  {
    id: 'english',
    name: 'English Opening',
    eco: 'A10',
    complexity: 'intermediate',
    position: 'english',
    moves: '1.c4',
    stats: [35, 38, 27],
  },
  {
    id: 'pirc',
    name: 'Pirc Defence',
    eco: 'B07',
    complexity: 'intermediate',
    position: 'pirc',
    moves: '1.e4 d6 2.d4 Nf6 3.Nc3 g6',
    stats: [40, 28, 32],
  },
];

function App() {
  const [active, setActive] = React.useState('explore');
  const [topQuery, setTopQuery] = React.useState('');
  const [heroQuery, setHeroQuery] = React.useState('');
  const [saved, setSaved] = React.useState(['caro-kann', 'london']);
  const [toast, setToast] = React.useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const toggleSave = (id) => {
    setSaved((prev) => {
      if (prev.includes(id)) {
        showToast(`Removed ${OPENINGS.find((o) => o.id === id).name} from repertoire`);
        return prev.filter((x) => x !== id);
      }
      showToast(`Saved ${OPENINGS.find((o) => o.id === id).name} to repertoire`);
      return [...prev, id];
    });
  };

  const surprise = () => {
    const o = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
    showToast(`Try the ${o.name} (${o.eco})`);
  };

  const q = (heroQuery || topQuery).toLowerCase();
  const filtered = q
    ? OPENINGS.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.eco.toLowerCase().includes(q) ||
          o.moves.toLowerCase().includes(q)
      )
    : OPENINGS;

  const repertoire = saved.map((id) => OPENINGS.find((o) => o.id === id)).filter(Boolean);

  return (
    <React.Fragment>
      <TopBar
        active={active}
        onNav={setActive}
        query={topQuery}
        onQuery={setTopQuery}
        onSurprise={surprise}
      />
      <Hero
        value={heroQuery}
        onChange={setHeroQuery}
        onPgn={() => showToast('PGN paste mode (demo)')}
      />
      <RepertoireRow
        items={repertoire}
        onUnsave={toggleSave}
        onClick={(o) => showToast(`Opening ${o.name}`)}
      />
      <section className="section">
        <div className="section-head">
          <h2>Popular openings</h2>
          <span className="count">
            {filtered.length} of {OPENINGS.length}
          </span>
        </div>
        <div className="grid">
          {filtered.map((o) => (
            <OpeningCard
              key={o.id}
              opening={o}
              saved={saved.includes(o.id)}
              onToggleSave={toggleSave}
              onClick={() => showToast(`Opening ${o.name}`)}
            />
          ))}
        </div>
      </section>
      <footer>
        <a href="#">About</a>·<a href="#">Lichess</a>·<a href="#">GitHub</a>
        <div style={{ marginTop: 8 }}>Opening Book — built on Lichess data</div>
      </footer>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
