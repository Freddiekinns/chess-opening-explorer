function RepertoireRow({ items, onUnsave, onClick }) {
  if (!items.length) {
    return (
      <section className="section">
        <div className="section-head">
          <h2>My repertoire</h2>
        </div>
        <div
          style={{
            padding: '40px 24px',
            background: '#232120',
            border: '1px dashed rgba(255,255,255,.10)',
            borderRadius: 8,
            textAlign: 'center',
            color: '#9a958e',
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 32, color: '#5a554e', marginBottom: 8 }}>★</div>
          No openings saved yet. Tap the star on any opening to save it to your repertoire for quick
          access.
        </div>
      </section>
    );
  }
  return (
    <section className="section">
      <div className="section-head">
        <h2>My repertoire</h2>
        <span className="count">{items.length} saved</span>
      </div>
      <div className="scroller">
        {items.map((o) => (
          <article key={o.id} className="rep-card" onClick={() => onClick(o)}>
            <div className="rep-board">
              <MiniBoard position={o.position} size="sm" />
            </div>
            <div className="rep-info">
              <div className="rep-head">
                <h3 className="rep-name">{o.name}</h3>
                <button
                  className="star"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnsave(o.id);
                  }}
                >
                  ★
                </button>
              </div>
              <div className="rep-moves">{o.moves}</div>
              <div className="rep-meta">
                <span className="eco-pill">{o.eco}</span>
                <span className={`cx-pill cx-${o.complexity}`}>{o.complexity}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
window.RepertoireRow = RepertoireRow;
