function Hero({ value, onChange, onPgn }) {
  return (
    <section className="hero">
      <h1>
        Opening <i>Book</i>
      </h1>
      <p className="sub">Discover, explore and learn chess openings.</p>
      <div className="hero-search">
        <input
          placeholder="Search variations, ECO codes, or systems..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button className="pgn" onClick={onPgn}>
        Search by pasting PGN
      </button>
    </section>
  );
}
window.Hero = Hero;
