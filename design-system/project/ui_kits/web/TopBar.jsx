function TopBar({ active, onNav, query, onQuery, onSurprise }) {
  return (
    <header className="topbar">
      <a
        className="logo"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNav('explore');
        }}
      >
        <img src="../../assets/opening-book-icon.png" alt="" />
        Opening Book
      </a>
      <nav className="nav">
        <a className={active === 'explore' ? 'active' : ''} onClick={() => onNav('explore')}>
          Explore
        </a>
        <a className={active === 'analyse' ? 'active' : ''} onClick={() => onNav('analyse')}>
          Analyse
        </a>
      </nav>
      <div className="right">
        <div className="tb-search">
          <input
            placeholder="Search openings"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <button className="surprise" onClick={onSurprise}>
          Surprise me
        </button>
      </div>
    </header>
  );
}
window.TopBar = TopBar;
