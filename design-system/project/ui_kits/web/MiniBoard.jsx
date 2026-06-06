// MiniBoard — schematic chessboard. Renders an 8x8 grid using --color-result-white/draw
// for the squares plus optional pieces from a position name.
const POSITIONS = {
  'caro-kann': [
    'rnbqkbnr',
    'pp..pppp',
    '..p.....',
    '...p....',
    '....P...',
    '........',
    'PPPP.PPP',
    'RNBQKBNR',
  ],
  sicilian: [
    'rnbqkbnr',
    'pp.ppppp',
    '........',
    '..p.....',
    '....P...',
    '........',
    'PPPP.PPP',
    'RNBQKBNR',
  ],
  london: [
    'rnbqkbnr',
    'pppppppp',
    '........',
    '........',
    '...P....',
    '.....N..',
    'PPP.PPPP',
    'RNBQKB.R',
  ],
  'queens-gambit': [
    'rnbqkbnr',
    'ppp.pppp',
    '........',
    '...p....',
    '..PP....',
    '........',
    'PP..PPPP',
    'RNBQKBNR',
  ],
  french: [
    'rnbqkbnr',
    'ppp..ppp',
    '....p...',
    '...p....',
    '...PP...',
    '........',
    'PPP..PPP',
    'RNBQKBNR',
  ],
  'kings-indian': [
    'rnbqk..r',
    'ppp.ppbp',
    '...p..p.',
    '........',
    '..PPP...',
    '..N..N..',
    'PP...PPP',
    'R.BQKB.R',
  ],
  'ruy-lopez': [
    'r.bqkbnr',
    'pppp.ppp',
    '..n.....',
    '.B..p...',
    '....P...',
    '.....N..',
    'PPPP.PPP',
    'RNBQK..R',
  ],
  english: [
    'rnbqkbnr',
    'pppp.ppp',
    '........',
    '....p...',
    '..P.....',
    '........',
    'PP.PPPPP',
    'RNBQKBNR',
  ],
  pirc: [
    'rnbqkb.r',
    'ppp.pp.p',
    '...p.np.',
    '........',
    '...PP...',
    '..N.....',
    'PPP..PPP',
    'R.BQKBNR',
  ],
};
const GLYPH = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔',
};

function MiniBoard({ position = 'caro-kann', size = 'sm' }) {
  const rows = POSITIONS[position] || POSITIONS['caro-kann'];
  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isLight = (r + f) % 2 === 0;
      const ch = rows[r][f];
      const piece = ch !== '.' ? GLYPH[ch] : '';
      const isWhite = ch && ch === ch.toUpperCase();
      squares.push(
        <div
          key={`${r}-${f}`}
          style={{
            background: isLight ? '#d4cfc7' : '#665e54',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'lg' ? '28px' : size === 'md' ? '20px' : '14px',
            lineHeight: 1,
            color: isWhite ? '#fafafa' : '#1a1816',
            textShadow: isWhite ? '0 1px 0 rgba(0,0,0,.25)' : 'none',
            fontFamily: '"DejaVu Sans","Noto Sans Symbols","Segoe UI Symbol",sans-serif',
          }}
        >
          {piece}
        </div>
      );
    }
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8,1fr)',
        gridTemplateRows: 'repeat(8,1fr)',
        width: '100%',
        aspectRatio: '1',
        background: '#1a1816',
      }}
    >
      {squares}
    </div>
  );
}

window.MiniBoard = MiniBoard;
