import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { BANDS, type BandId, type ExplorerResult } from '../../lib/lichessExplorer';
import styles from './PlayThrough.module.css';

/**
 * Gate B prototype (experiment, unlinked): watch the line with pauses where
 * your opponents split at your level, play it from memory, then solve Lichess
 * puzzles (CC0) from games in the same variation. Reached only through
 * `?lab=playthrough` on an opening page.
 */

type Side = 'white' | 'black';
type LineBands = { fen: string; bands: Record<string, ExplorerResult | null> | null };
type Puzzle = { id: string; fen: string; moves: string[]; rating: number };
type Stage = 'watch' | 'memory' | 'puzzles' | 'done';

// Lichess CC0 puzzles by page FEN, fetched only when the memory step starts.
const PUZZLE_URL = '/lab/play-through-puzzles.json';
const STEP_MS = 900;
const MIN_GAMES = 500;
const TOP_SPLIT = 0.6;
const SECOND_SPLIT = 0.2;

interface Props {
  name: string;
  fen: string;
  moves: string[];
  band: BandId | null;
  onClose: () => void;
}

/**
 * The learner's side from the name's last telling word: Defense, Declined,
 * Accepted, Countergambit or Counterattack are Black's; Gambit, Attack, System
 * or Opening are White's. Center Attack is White's, Traxler Counterattack
 * Black's. No such word: White.
 */
function defaultSide(name: string): Side {
  let side: Side = 'white';
  const re =
    /(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g;
  for (const m of name.matchAll(re)) side = m[1] ? 'black' : 'white';
  return side;
}

interface MoveRow {
  san: string;
  share: number;
  wins: number;
}

function rows(result: ExplorerResult | null | undefined, mover: Side, line?: string): MoveRow[] {
  if (!result || result.totalGames < MIN_GAMES) return [];
  const all = result.moves.map((m) => ({
    san: m.san,
    share: m.games / result.totalGames,
    wins: mover === 'white' ? m.whitePct : m.blackPct,
  }));
  const top = all.slice(0, 3);
  const mine = line ? all.find((r) => r.san === line) : undefined;
  return mine && !top.includes(mine) ? [...top, mine] : top;
}

function isSplit(r: MoveRow[]): boolean {
  return r.length > 1 && r[0].share < TOP_SPLIT && r[1].share > SECOND_SPLIT;
}

function lastSquares(before: string, san: string): string {
  const m = new Chess(before).move(san);
  return m.from + m.to;
}

/** The variation Lichess tags its puzzles with: the name's first part after the family. */
function variationOf(name: string): string {
  const [family, rest] = name.split(': ');
  return rest ? rest.split(',')[0] : family;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const sideName = (s: Side) => (s === 'white' ? 'White' : 'Black');

function Bars({ data, line, mover }: { data: MoveRow[]; line?: string; mover: Side }) {
  return (
    <ul className={styles.bars}>
      {data.map((r) => (
        <li key={r.san} className={r.san === line ? styles.barLine : undefined}>
          <span className={styles.san}>{r.san}</span>
          <span className={styles.track}>
            <span className={styles.fill} style={{ width: pct(r.share) }} />
          </span>
          <span className={styles.num}>{pct(r.share)}</span>
          <span className={styles.wins}>
            {sideName(mover)} wins {Math.round(r.wins)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PlayThrough({ name, fen, moves, band, onClose }: Props) {
  const level = band && band !== 'masters' ? band : '1400';
  const levelInfo = BANDS.find((b) => b.id === level);
  const levelText = levelInfo
    ? `${levelInfo.label}${levelInfo.range && level !== 'all' ? ` (${levelInfo.range})` : ''}`
    : level;

  const [side, setSide] = useState<Side>(() => defaultSide(name));
  const fens = useMemo(() => {
    const g = new Chess();
    const out = [g.fen()];
    for (const san of moves) {
      g.move(san);
      out.push(g.fen());
    }
    return out;
  }, [moves]);

  const [bands, setBands] = useState<LineBands[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/openings/line-bands?fens=${encodeURIComponent(fens.join('|'))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => alive && setBands(body?.data ?? []))
      .catch(() => alive && setBands([]));
    return () => {
      alive = false;
    };
  }, [fens]);

  const moverAt = (i: number): Side => (fens[i].split(' ')[1] === 'w' ? 'white' : 'black');
  const rowsAt = (i: number) => rows(bands?.[i]?.bands?.[level], moverAt(i), moves[i]);

  // Pauses: before an opponent's move where the opponents split, and the end.
  const pauses = useMemo(() => {
    const set = new Set<number>();
    if (!bands) return set;
    moves.forEach((_, i) => {
      if (moverAt(i) !== side && isSplit(rowsAt(i))) set.add(i);
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bands, side, level, moves]);

  const [stage, setStage] = useState<Stage>('watch');

  // ── Watch ──
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState<number | null>(null);
  useEffect(() => {
    if (!playing || stage !== 'watch') return;
    if (ply >= moves.length) {
      setPlaying(false);
      setPaused(moves.length);
      return;
    }
    if (pauses.has(ply) && paused !== ply) {
      setPlaying(false);
      setPaused(ply);
      return;
    }
    const t = setTimeout(() => {
      setPaused(null);
      setPly((p) => p + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, ply, pauses, paused, moves.length, stage]);

  const resume = () => {
    setPaused(ply); // mark this pause as seen
    setPlaying(true);
  };
  const restartWatch = () => {
    setPly(0);
    setPaused(null);
    setPlaying(true);
  };

  // ── Memory ──
  // The learner's moves come in parts of two (a lone last move joins the part before). A part
  // with a miss repeats from its start until it is played clean; if any part needed that, the
  // whole line follows once through.
  const mine = moves.map((_, i) => i).filter((i) => moverAt(i) === side);
  const parts = useMemo(() => {
    const out: number[][] = [];
    for (let i = 0; i < mine.length; i += 2) out.push(mine.slice(i, i + 2));
    if (out.length > 1 && out[out.length - 1].length === 1) out[out.length - 2].push(out.pop()![0]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.join(',')]);
  const partOf = (ply: number) => parts.findIndex((p) => p.includes(ply));
  const [memPly, setMemPly] = useState(0);
  const [misses, setMisses] = useState(0);
  const [memNote, setMemNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pass, setPass] = useState<'parts' | 'whole'>('parts');
  const [partMissed, setPartMissed] = useState(false);
  const [repeats, setRepeats] = useState(0);
  const [wholeMisses, setWholeMisses] = useState(0);
  const [rewindTo, setRewindTo] = useState<number | null>(null);

  useEffect(() => {
    if (stage !== 'memory') return;
    if (rewindTo !== null) {
      const t = setTimeout(() => {
        setMemPly(rewindTo);
        setRewindTo(null);
      }, 1200);
      return () => clearTimeout(t);
    }
    if (memPly >= moves.length) return;
    if (moverAt(memPly) !== side) {
      const t = setTimeout(() => setMemPly((p) => p + 1), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, memPly, side, moves.length, rewindTo]);

  const startMemory = () => {
    setStage('memory');
    setMemPly(0);
    setMisses(0);
    setMemNote(null);
    setSelected(null);
    setPass('parts');
    setPartMissed(false);
    setRepeats(0);
    setWholeMisses(0);
    setRewindTo(null);
  };

  // After a correct move: finish the part (repeat it if it had a miss) or the parts pass.
  const afterCorrect = (ply: number) => {
    if (pass === 'whole') return;
    const k = partOf(ply);
    const part = parts[k];
    if (ply !== part[part.length - 1]) return;
    if (partMissed) {
      setPartMissed(false);
      setRepeats((r) => r + 1);
      setMemNote(
        parts.length > 1
          ? `Part ${k + 1} again, until it is clean.`
          : 'Again from the start, until it is clean.'
      );
      setRewindTo(part[0] - (part[0] > 0 && moverAt(part[0] - 1) !== side ? 1 : 0));
    } else if (k === parts.length - 1 && repeats > 0 && parts.length > 1) {
      setPass('whole');
      setMemNote('Every part is clean. Now the whole line, once through.');
      setRewindTo(0);
    }
  };

  // ── Puzzles ──
  const [puzzleSet, setPuzzleSet] = useState<Record<Side, Puzzle[]> | null>(null);
  useEffect(() => {
    if (stage !== 'memory' || puzzleSet) return;
    let alive = true;
    fetch(PUZZLE_URL)
      .then((r) => (r.ok ? r.json() : {}))
      .then(
        (all: Record<string, Record<Side, Puzzle[]>>) =>
          alive && setPuzzleSet(all[fen] ?? { white: [], black: [] })
      )
      .catch(() => alive && setPuzzleSet({ white: [], black: [] }));
    return () => {
      alive = false;
    };
  }, [stage, puzzleSet, fen]);
  // Only puzzles the learner's side solves.
  const puzzles = puzzleSet?.[side] ?? [];
  const [pIndex, setPIndex] = useState(0);
  const [pStep, setPStep] = useState(0); // index into puzzle.moves already played
  const [pNote, setPNote] = useState<string | null>(null);
  const [pMisses, setPMisses] = useState(0);
  const [solved, setSolved] = useState(0);
  const puzzle = puzzles[pIndex];
  const puzzleFen = useMemo(() => {
    if (!puzzle) return null;
    const g = new Chess(puzzle.fen);
    for (const uci of puzzle.moves.slice(0, pStep)) {
      g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return g.fen();
  }, [puzzle, pStep]);
  const puzzleSide: Side | null = puzzle
    ? new Chess(puzzle.fen).turn() === 'w'
      ? 'black'
      : 'white'
    : null;
  const puzzleDone = puzzle ? pStep >= puzzle.moves.length : false;

  useEffect(() => {
    if (stage !== 'puzzles' || !puzzle || puzzleDone) return;
    // Even steps are the opponent's: the mistake, then each reply.
    if (pStep % 2 === 0) {
      const t = setTimeout(() => setPStep((s) => s + 1), pStep === 0 ? 800 : 500);
      return () => clearTimeout(t);
    }
  }, [stage, puzzle, pStep, puzzleDone]);

  useEffect(() => {
    if (stage === 'puzzles' && puzzleDone) setSolved((n) => (pMisses < 2 ? n + 1 : n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleDone]);

  const startPuzzles = () => {
    if (puzzles.length === 0) return setStage('done');
    setStage('puzzles');
    setPIndex(0);
    setPStep(0);
    setPNote(null);
    setPMisses(0);
    setSolved(0);
  };
  const nextPuzzle = () => {
    if (pIndex + 1 >= puzzles.length) return setStage('done');
    setPIndex((i) => i + 1);
    setPStep(0);
    setPNote(null);
    setPMisses(0);
  };

  // ── Moves on the board (memory and puzzles) ──
  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      if (stage === 'memory') {
        if (memPly >= moves.length || moverAt(memPly) !== side) return false;
        const g = new Chess(fens[memPly]);
        let played;
        try {
          played = g.move({ from, to, promotion: 'q' });
        } catch {
          return false;
        }
        if (played.san === moves[memPly]) {
          setMemPly((p) => p + 1);
          setMisses(0);
          setMemNote(null);
          afterCorrect(memPly);
          return true;
        }
        const n = misses + 1;
        setMisses(n);
        if (pass === 'parts') setPartMissed(true);
        else if (n === 1) setWholeMisses((w) => w + 1);
        setMemNote(
          n >= 2
            ? `The line plays ${moveLabel(memPly, moves[memPly])}.`
            : `${played.san} is not this line. Try again.`
        );
        return false;
      }
      if (stage === 'puzzles' && puzzle && puzzleFen && pStep % 2 === 1 && !puzzleDone) {
        const want = puzzle.moves[pStep];
        const g = new Chess(puzzleFen);
        let played;
        try {
          played = g.move({ from, to, promotion: 'q' });
        } catch {
          return false;
        }
        const uci = played.from + played.to + (played.promotion ?? '');
        if (uci === want || uci === want.slice(0, 4) + 'q' || g.isCheckmate()) {
          setPNote(null);
          setPStep((s) => (g.isCheckmate() ? puzzle.moves.length : s + 1));
          return true;
        }
        const n = pMisses + 1;
        setPMisses(n);
        const hint = new Chess(puzzleFen).move({
          from: want.slice(0, 2),
          to: want.slice(2, 4),
          promotion: want[4],
        }).san;
        setPNote(n >= 2 ? `The best move is ${hint}.` : 'Not quite. Try again.');
        return false;
      }
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stage,
      memPly,
      misses,
      side,
      fens,
      moves,
      puzzle,
      puzzleFen,
      pStep,
      puzzleDone,
      pMisses,
      pass,
      partMissed,
      repeats,
      parts,
    ]
  );

  const onSquareClick = ({ square }: { square: string }) => {
    if (selected && selected !== square) {
      tryMove(selected, square);
      setSelected(null);
      return;
    }
    setSelected(square as Square);
  };

  function moveLabel(i: number, san: string) {
    const n = Math.floor(i / 2) + 1;
    return i % 2 === 0 ? `${n}.${san}` : `${n}...${san}`;
  }

  // ── Render ──
  const boardFen =
    stage === 'watch'
      ? fens[ply]
      : stage === 'memory'
        ? fens[Math.min(memPly, moves.length)]
        : stage === 'puzzles' && puzzleFen
          ? puzzleFen
          : fens[moves.length];
  // The move just played, highlighted so a puzzle's mistake is visible.
  const lastMove: string | null =
    stage === 'watch' && ply > 0
      ? lastSquares(fens[ply - 1], moves[ply - 1])
      : stage === 'memory' && memPly > 0
        ? lastSquares(fens[memPly - 1], moves[memPly - 1])
        : stage === 'puzzles' && puzzle && pStep > 0
          ? puzzle.moves[pStep - 1].slice(0, 4)
          : null;
  const highlight: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    highlight[lastMove.slice(0, 2)] = { background: 'var(--accent-a30)' };
    highlight[lastMove.slice(2, 4)] = { background: 'var(--accent-a30)' };
  }
  const orientation = stage === 'puzzles' && puzzleSide ? puzzleSide : side;
  const interactive =
    (stage === 'memory' &&
      rewindTo === null &&
      memPly < moves.length &&
      moverAt(memPly) === side) ||
    (stage === 'puzzles' && pStep % 2 === 1 && !puzzleDone);
  if (selected && interactive) highlight[selected] = { background: 'var(--accent-a50)' };

  const opp = sideName(side === 'white' ? 'black' : 'white');
  const endRows = bands ? rowsAt(moves.length) : [];

  return (
    <div className={styles.overlay} role="dialog" aria-label={`Play through ${name}`}>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>Play through · prototype</p>
          <h2 className={styles.title}>{name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <ol className={styles.stages}>
        {(['watch', 'memory', 'puzzles'] as const).map((s, i) => (
          <li key={s} className={stage === s ? styles.stageOn : undefined}>
            {i + 1}. {s === 'watch' ? 'Watch' : s === 'memory' ? 'Your turn' : 'Puzzles'}
          </li>
        ))}
      </ol>

      <div className={styles.board}>
        <Chessboard
          options={{
            position: boardFen,
            boardOrientation: orientation,
            allowDragging: interactive,
            onPieceDrop: interactive
              ? ({ sourceSquare, targetSquare }) =>
                  targetSquare ? tryMove(sourceSquare, targetSquare) : false
              : undefined,
            onSquareClick: interactive ? onSquareClick : undefined,
            squareStyles: highlight,
            boardStyle: { borderRadius: '8px', touchAction: interactive ? 'none' : 'auto' },
          }}
        />
      </div>

      <section className={styles.panel} aria-live="polite">
        {stage === 'watch' && (
          <>
            {!bands && <p className={styles.muted}>Loading what players at your level play…</p>}
            {bands && ply === 0 && !playing && paused === null && (
              <>
                <p>
                  Watch the line as <strong>{sideName(side)}</strong>. It stops where your opponents
                  at <strong>{levelText}</strong> split.
                </p>
                <div className={styles.row}>
                  <button type="button" className={styles.primary} onClick={restartWatch}>
                    ▶ Play the line
                  </button>
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() => setSide(side === 'white' ? 'black' : 'white')}
                  >
                    Play as {side === 'white' ? 'Black' : 'White'} instead
                  </button>
                </div>
              </>
            )}
            {playing && (
              <p className={styles.muted}>
                {ply > 0 ? moveLabel(ply - 1, moves[ply - 1]) : 'Starting…'}
              </p>
            )}
            {!playing && paused !== null && paused < moves.length && (
              <>
                <p>
                  <strong>{opp} has a choice here.</strong> What your opponents at {levelText} play:
                </p>
                <Bars data={rowsAt(paused)} line={moves[paused]} mover={moverAt(paused)} />
                <p className={styles.muted}>
                  This line follows {moveLabel(paused, moves[paused])}.
                </p>
                <button type="button" className={styles.primary} onClick={resume}>
                  Continue
                </button>
              </>
            )}
            {!playing && paused === moves.length && (
              <>
                <p>
                  <strong>The line ends here.</strong>
                  {endRows.length > 0
                    ? ` What ${sideName(moverAt(moves.length))} plays next at ${levelText}:`
                    : ''}
                </p>
                {endRows.length > 0 && <Bars data={endRows} mover={moverAt(moves.length)} />}
                <div className={styles.row}>
                  <button type="button" className={styles.primary} onClick={startMemory}>
                    Your turn: play it from memory →
                  </button>
                  <button type="button" className={styles.ghost} onClick={restartWatch}>
                    Watch again
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {stage === 'memory' && (
          <>
            {memPly < moves.length || rewindTo !== null ? (
              <p>
                {pass === 'whole' ? (
                  <>The whole line, once through. {opp} answers by the line.</>
                ) : (
                  <>
                    Play {sideName(side)}&apos;s moves. {opp} answers by the line.
                  </>
                )}
                <span className={styles.muted}>
                  {' '}
                  {pass === 'parts' && parts.length > 1
                    ? `Part ${partOf(mine.find((i) => i >= memPly) ?? mine[mine.length - 1]) + 1} of ${parts.length} · `
                    : ''}
                  Move {Math.min(mine.filter((i) => i < memPly).length + 1, mine.length)} of{' '}
                  {mine.length}.
                </span>
              </p>
            ) : (
              <p>
                <strong>
                  {repeats === 0
                    ? 'You played the line from memory, first time.'
                    : wholeMisses === 0
                      ? `You played the line from memory${parts.length > 1 ? ', once through' : ''}.`
                      : `You played the line through, with ${wholeMisses} ${wholeMisses === 1 ? 'move' : 'moves'} to look at again.`}
                </strong>
                {repeats > 0 && (
                  <span className={styles.muted}>
                    {' '}
                    {repeats} {repeats === 1 ? 'part' : 'parts'} repeated on the way.
                  </span>
                )}
              </p>
            )}
            {memNote && <p className={styles.note}>{memNote}</p>}
            {memPly >= moves.length && rewindTo === null && (
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={startPuzzles}
                  disabled={puzzleSet === null}
                >
                  {puzzleSet === null
                    ? 'Finding puzzles…'
                    : puzzles.length > 0
                      ? `${puzzles.length} puzzles from the ${variationOf(name)} →`
                      : 'Finish'}
                </button>
                <button type="button" className={styles.ghost} onClick={startMemory}>
                  Again
                </button>
              </div>
            )}
          </>
        )}

        {stage === 'puzzles' && puzzle && (
          <>
            <p className={styles.muted}>
              Puzzle {pIndex + 1} of {puzzles.length} · move {puzzle.fen.split(' ')[5]} of a Lichess
              game in the {variationOf(name)} · rated {puzzle.rating}
            </p>
            {!puzzleDone && pStep === 0 && (
              <p>
                {puzzleSide && sideName(puzzleSide === 'white' ? 'black' : 'white')} is about to
                make a mistake…
              </p>
            )}
            {!puzzleDone && pStep > 0 && puzzleSide && (
              <p>
                <strong>{sideName(puzzleSide)} to move.</strong> The last move was a mistake: find
                the best reply.
              </p>
            )}
            {pNote && <p className={styles.note}>{pNote}</p>}
            {puzzleDone && (
              <>
                <p>
                  <strong>Solved.</strong>
                </p>
                <button type="button" className={styles.primary} onClick={nextPuzzle}>
                  {pIndex + 1 < puzzles.length ? 'Next puzzle →' : 'Finish'}
                </button>
              </>
            )}
            <p className={styles.credit}>
              Puzzle{' '}
              <a
                href={`https://lichess.org/training/${puzzle.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {puzzle.id}
              </a>{' '}
              from the Lichess puzzle database (CC0).
            </p>
          </>
        )}

        {stage === 'done' && (
          <>
            <p>
              <strong>Session done.</strong>{' '}
              {puzzles.length > 0
                ? `You watched the line, played it from memory and solved ${solved} of ${puzzles.length} puzzles.`
                : 'You watched the line and played it from memory.'}
            </p>
            {puzzles.length === 0 && (
              <p className={styles.muted}>No puzzles fit this line closely enough yet.</p>
            )}
            <div className={styles.row}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setStage('watch');
                  setPly(0);
                  setPaused(null);
                  setPlaying(false);
                }}
              >
                Start again
              </button>
              <button type="button" className={styles.ghost} onClick={onClose}>
                Back to the page
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
