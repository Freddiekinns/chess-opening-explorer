function OpeningCard({ opening, saved, onToggleSave, onClick }) {
  const { name, eco, complexity, position, moves, stats } = opening;
  return (
    <article className="op-card" onClick={onClick}>
      <div className="op-board">
        <MiniBoard position={position} size="md" />
      </div>
      <div className="op-info">
        <div className="op-head">
          <h3 className="op-name">{name}</h3>
          <button
            className="star"
            style={{
              background: 'none',
              border: 'none',
              color: saved ? '#e85d04' : '#5a554e',
              cursor: 'pointer',
              fontSize: '16px',
              padding: 0,
              lineHeight: 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(opening.id);
            }}
          >
            ★
          </button>
        </div>
        <div className="op-moves">{moves}</div>
        <div className="op-meta">
          <span className="eco-pill">{eco}</span>
          <span className={`cx-pill cx-${complexity}`}>{complexity}</span>
        </div>
        <div className="op-bar">
          <div className="w" style={{ flex: stats[0] }} />
          <div className="d" style={{ flex: stats[1] }} />
          <div className="b" style={{ flex: stats[2] }} />
        </div>
        <div className="op-labels">
          <span>{stats[0]}%</span>
          <span>{stats[1]}%</span>
          <span>{stats[2]}%</span>
        </div>
      </div>
    </article>
  );
}
window.OpeningCard = OpeningCard;
