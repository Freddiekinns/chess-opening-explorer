/**
 * Reads the moves, routes, squares and pieces a Common plan names, and checks
 * each against the position (#228). A reference is drawn on the plans diagram
 * only if it passes: a move some piece can make now, or once the plan's
 * earlier moves are made; a square; a piece that is really there. Anything
 * else stays plain text, so the board never shows a move that can't happen.
 *
 * Kept to `chess.js` and erasable TypeScript so that
 * `tools/content-review/plan-check.js` can import it under Node and report the
 * references that fail across every opening.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

export type PlanSide = 'white' | 'black' | 'general';

const WHITE_PREFIX =
  /^(?:(?:for\s+)?white[\s:,]|white's\s+(?:plan|primary|main|goal|key|long)|as\s+white[\s:,]|white\s+(?:aims|seeks|focuses|should|tries|typically|can|will|plays|often|may|must|needs?|plans|solidifies|completes|accepts|looks|develops|prepares))/i;

const BLACK_PREFIX =
  /^(?:(?:for\s+)?black[\s:,]|black's\s+(?:plan|primary|main|goal|key|long)|as\s+black[\s:,]|black\s+(?:aims|seeks|focuses|should|tries|typically|can|will|plays|often|may|must|needs?|plans|works|challenges|develops|looks|frequently|sacrifices))/i;

// Matches the label portion to strip from the display text
const STRIP_PREFIX =
  /^(?:(?:for\s+)?(?:white|black)[\s:,]+(?:the\s+plan\s+is\s+to\s+)?|(?:white|black)'s\s+plan(?:\s+is)?\s*[:.]?\s*|as\s+(?:white|black)[\s:,]+)/i;

function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Which side a plan is for, and its text with the side label taken off. */
export function classifyPlan(plan: string): { side: PlanSide; text: string } {
  const trimmed = plan.trim();
  const strip = (s: string) => capitaliseFirst(s.replace(STRIP_PREFIX, '').replace(/^[,:\s]+/, ''));
  if (WHITE_PREFIX.test(trimmed)) return { side: 'white', text: strip(trimmed) };
  if (BLACK_PREFIX.test(trimmed)) return { side: 'black', text: strip(trimmed) };
  return { side: 'general', text: capitaliseFirst(trimmed) };
}

export type ReferenceStatus = 'now' | 'later' | 'on-board' | 'invalid';

export interface PlanArrow {
  from: string;
  to: string;
  /** Only possible once the plan's earlier moves are made. */
  later: boolean;
}

export interface PlanReference {
  /** Exactly as it appears in the plan text. */
  text: string;
  kind: 'move' | 'route' | 'square' | 'piece';
  status: ReferenceStatus;
  arrows: PlanArrow[];
  highlight: string[];
  rings: string[];
  /** Plain English, for the caption under the diagram. */
  description: string;
  /** Why an invalid reference failed, for the content review. */
  reason?: string;
}

export type PlanSegment = string | PlanReference;

export interface ParsedPlan {
  side: PlanSide;
  text: string;
  segments: PlanSegment[];
}

const SQ = '[a-h][1-8]';
/** A later leg of a route: a square, or a move written out ("Nxe4"). */
const ROUTE_STEP = `(?:[KQRBN][a-h]?[1-8]?x?)?${SQ}`;
const TOKEN = new RegExp(
  '(?<![A-Za-z0-9])(?:' +
    [
      `(?<breakSq>${SQ})[- ]pawn[- ](?:break|push|advance|lever|thrust|storm)s?(?![A-Za-z])`,
      `(?<pieceSq>${SQ})[- ](?<pieceName>bishop|knight|rook|queen|king|pawn)(?![A-Za-z])`,
      `(?<square>${SQ})[- ](?:squares?|outposts?)(?![A-Za-z])`,
      `(?<route>(?:\\.\\.\\.)?[KQRBN]?[a-h]?[1-8]?${SQ}(?:-${ROUTE_STEP})+)`,
      `(?<castle>(?:\\.\\.\\.)?(?:O-O-O|O-O|0-0-0|0-0))`,
      `(?<move>(?:\\.\\.\\.)?(?:[KQRBN][a-h]?[1-8]?x?${SQ}|[a-h]x${SQ}|${SQ})(?:=[QRBN])?[+#]?)`,
    ].join('|') +
    ')(?![A-Za-z0-9])',
  'g'
);

/** Words before a bare square that make it a place, not a pawn move. */
const SQUARE_CONTEXT =
  /(?:\be\.g\.,?|\b(?:on|onto|at|of|the|to|from|into|towards?|via|against|control(?:s|ling)?|occup(?:y|ies|ying)|attack(?:s|ing)?|target(?:s|ing)?|pressur(?:e|es|ing)|undermin(?:e|es|ing)|blockad(?:e|es|ing)|support(?:s|ing)?|weaken(?:s|ing)?|exploit(?:s|ing)?))\s+\(?$/i;

/** A side named just before a move, in the same clause: "after White plays c4". */
const NAMED_SIDE =
  /\b(white|black)\s+(?:(?:often|usually|typically|can|may|might|will|then|later)\s+)?(?:plays?|playing|push(?:es)?|castles?|answers?|repl(?:y|ies)|responds?|captures?|takes?|recaptures?)\s+(?:with\s+)?$/i;

/** What separates items of a list: ", ", " and ", " or ", ", and ". */
const LIST_GAP = /^\s*(?:,|\/|and|or|,\s*(?:and|or))\s*$/;

/** A move number just before a token: "6.", "12...". */
const MOVE_NUMBER = /\b\d+\.(?:\.\.)?\s*$/;

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
const PIECE_BY_NAME: Record<string, PieceSymbol> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};
const COLOUR_NAME: Record<Color, string> = { w: 'White', b: 'Black' };

/** A board with `colour` to move, or null if the position won't allow it. */
function boardFor(fen: string, colour: Color): Chess | null {
  try {
    const board = new Chess(fen);
    if (board.turn() === colour) return board;
    try {
      board.setTurn(colour);
      return board;
    } catch {
      // The side to move is in check, so a null move is refused. Hand the move
      // over in the FEN instead: the other side's plans still need checking.
      const fields = fen.split(' ');
      fields[1] = colour;
      fields[3] = '-';
      return new Chess(fields.join(' '), { skipValidation: true });
    }
  } catch {
    return null;
  }
}

function tryMove(board: Chess | null, move: string | { from: string; to: string }): Move | null {
  if (!board) return null;
  try {
    return board.move(move as string);
  } catch {
    return null;
  }
}

/** Hands the move back to `colour`, so the plan's next step is theirs too. */
function keepTurn(board: Chess, colour: Color): void {
  try {
    if (board.turn() !== colour) board.setTurn(colour);
  } catch {
    // Left as is: the plan's next step will fail its check.
  }
}

function invalid(text: string, kind: PlanReference['kind'], reason: string): PlanReference {
  return {
    text,
    kind,
    status: 'invalid',
    arrows: [],
    highlight: [],
    rings: [],
    description: '',
    reason,
  };
}

/** SAN without check marks, with 0-0 written as O-O. */
function normaliseSan(san: string): string {
  return san
    .replace(/^\.\.\./, '')
    .replace(/0/g, 'O')
    .replace(/[+#]$/, '');
}

/** The square and piece a SAN move names, for "is it already there?". */
function sanTarget(san: string): { square: Square; piece: PieceSymbol } | null {
  const m = /([KQRBN])?[a-h]?[1-8]?x?([a-h][1-8])(?:=[QRBN])?$/.exec(san);
  if (!m) return null;
  return { square: m[2] as Square, piece: (m[1]?.toLowerCase() ?? 'p') as PieceSymbol };
}

class PlanReader {
  private sims = new Map<Color, Chess | null>();
  private readonly fen: string;
  private readonly side: PlanSide;
  private readonly base: Chess;

  constructor(fen: string, side: PlanSide) {
    this.fen = fen;
    this.side = side;
    this.base = new Chess(fen);
  }

  /** The board just after the last accepted move, before the turn was handed back. */
  private lastMove: { board: Chess; colour: Color } | null = null;

  /**
   * Who could be making this move: the dots say Black, then a side named just
   * before it ("after White plays c4"), then the plan's label.
   */
  colours(dots: boolean, named: Color | null = null): Color[] {
    if (dots) return ['b'];
    if (named) return [named];
    if (this.side === 'black') return ['b'];
    if (this.side === 'white') return ['w'];
    const turn = this.base.turn();
    return [turn, turn === 'w' ? 'b' : 'w'];
  }

  private sim(colour: Color): Chess | null {
    if (!this.sims.has(colour)) this.sims.set(colour, boardFor(this.fen, colour));
    return this.sims.get(colour) ?? null;
  }

  /** Plays an accepted step on the plan's running board for that side. */
  private advance(colour: Color, move: string | { from: string; to: string }): void {
    const sim = this.sim(colour);
    if (!sim || !tryMove(sim, move)) return;
    this.lastMove = { board: new Chess(sim.fen()), colour };
    keepTurn(sim, colour);
    // The move gave check, so the turn can't come back: drop it rather than
    // leave the running board with the wrong side to move.
    if (sim.turn() !== colour) sim.undo();
  }

  /** Now, later, or null: one step for one side. */
  private step(
    colour: Color,
    move: string | { from: string; to: string }
  ): { move: Move; later: boolean } | null {
    const now = tryMove(boardFor(this.fen, colour), move);
    if (now) {
      this.advance(colour, move);
      return { move: now, later: false };
    }
    const simCopy = this.sim(colour);
    const later = simCopy ? tryMove(new Chess(simCopy.fen()), move) : null;
    if (later) {
      this.advance(colour, move);
      return { move: later, later: true };
    }
    const fresh = boardFor(this.fen, colour);
    const prepared =
      (simCopy && this.afterOneQuietMove(simCopy, colour, move)) ||
      (fresh && this.afterOneQuietMove(fresh, colour, move));
    if (prepared) {
      this.advance(colour, move);
      return { move: prepared, later: true };
    }
    return null;
  }

  /**
   * Plans often leave a preparatory move unsaid ("Bg2" before g3). Accepts a
   * move that becomes possible after any one move by the same side, as long
   * as that move wasn't by the piece itself, so the arrow starts where the
   * piece really stands.
   */
  private afterOneQuietMove(
    from: Chess,
    colour: Color,
    move: string | { from: string; to: string }
  ): Move | null {
    for (const prep of from.moves({ verbose: true })) {
      const board = new Chess(from.fen());
      board.move(prep);
      keepTurn(board, colour);
      if (board.turn() !== colour) continue;
      const result = tryMove(board, move);
      if (result && result.from !== prep.to) return result;
    }
    return null;
  }

  /**
   * The other side's answer straight after an accepted move, as in an exchange
   * written out ("Bxc3 bxc3", "4.Bxf6 Qxf6").
   */
  private reply(san: string): { move: Move; colour: Color } | null {
    if (!this.lastMove) return null;
    const board = new Chess(this.lastMove.board.fen());
    const move = tryMove(board, san);
    if (!move) return null;
    this.lastMove = { board, colour: move.color };
    return { move, colour: move.color };
  }

  move(text: string, opts: { named?: Color | null; reply?: boolean } = {}): PlanReference {
    const san = normaliseSan(text);
    const answer = opts.reply ? this.reply(san) : null;
    const colours = answer ? [answer.colour] : this.colours(text.startsWith('...'), opts.named);
    for (const colour of colours) {
      const result = answer ? { move: answer.move, later: true } : this.step(colour, san);
      if (!result) continue;
      const { move, later } = result;
      const description = move.san.startsWith('O-O')
        ? `${COLOUR_NAME[colour]} castles ${move.san === 'O-O-O' ? 'queenside' : 'kingside'}`
        : `${COLOUR_NAME[colour]} ${PIECE_NAMES[move.piece]} from ${move.from} to ${move.to}`;
      return {
        text,
        kind: 'move',
        status: later ? 'later' : 'now',
        arrows: [{ from: move.from, to: move.to, later }],
        highlight: [],
        rings: [],
        description: later ? `${description}, once the earlier moves are made` : description,
      };
    }
    const target = sanTarget(san);
    const there = target && this.base.get(target.square);
    if (target && there && there.type === target.piece) {
      return {
        text,
        kind: 'piece',
        status: 'on-board',
        arrows: [],
        highlight: [],
        rings: [target.square],
        description: `The ${COLOUR_NAME[there.color]} ${PIECE_NAMES[there.type]} on ${target.square}`,
      };
    }
    const ambiguous = this.ambiguity(colours, san);
    if (ambiguous) return invalid(text, 'move', ambiguous);
    return invalid(
      text,
      'move',
      `No piece can play ${san} here, now or after the plan's earlier moves`
    );
  }

  /** "Ne7" when two knights can reach e7: a notation slip, not a bad plan. */
  ambiguity(colours: Color[], san: string): string | null {
    const target = sanTarget(san);
    if (!target || /^[KQRBN][a-h1-8]x?[a-h][1-8]/.test(san)) return null;
    for (const colour of colours) {
      const board = boardFor(this.fen, colour);
      if (!board) continue;
      const from = board
        .moves({ verbose: true })
        .filter((m) => m.to === target.square && m.piece === target.piece)
        .map((m) => m.from);
      if (from.length > 1) {
        return `${san} is ambiguous: the ${PIECE_NAMES[target.piece]}s on ${from.join(' and ')} can both go there`;
      }
    }
    return null;
  }

  route(text: string, named: Color | null = null): PlanReference {
    const dots = text.startsWith('...');
    const [first, ...rest] = text.replace(/^\.\.\./, '').split('-');
    for (const colour of this.colours(dots, named)) {
      const arrows = this.routeFor(colour, first, rest);
      if (!arrows) continue;
      const chained = arrows.every((a, i) => i === 0 || a.from === arrows[i - 1].to);
      const piece = this.pieceName(arrows[0].from, colour, first);
      const description = chained
        ? `${capitaliseFirst(piece)} from ${arrows[0].from} to ${arrows.map((a) => a.to).join(', then ')}`
        : capitaliseFirst(arrows.map((a) => `${piece} from ${a.from} to ${a.to}`).join(', then '));
      return {
        text,
        kind: 'route',
        status: arrows[0].later ? 'later' : 'now',
        arrows,
        highlight: [],
        rings: [],
        description,
      };
    }
    // "the e4-d4 centre": not a route, but pieces already standing together.
    const squares = [first, ...rest].map((leg) => leg.slice(-2)) as Square[];
    const pieces = squares.map((sq) => this.base.get(sq));
    const owner = pieces[0]?.color;
    if (owner && pieces.every((p) => p && p.color === owner)) {
      return {
        text,
        kind: 'piece',
        status: 'on-board',
        arrows: [],
        highlight: [],
        rings: squares,
        description: `The ${COLOUR_NAME[owner]} pieces on ${squares.join(' and ')}`,
      };
    }
    const ambiguous = /^[KQRBN]/.test(first) && this.ambiguity(this.colours(dots, named), first);
    return invalid(text, 'route', ambiguous || `One step of ${text} can't be played here`);
  }

  private pieceName(from: string, colour: Color, first: string): string {
    const letter = /^[KQRBN]/.exec(first)?.[0];
    if (letter) return PIECE_NAMES[letter.toLowerCase() as PieceSymbol];
    const there = this.base.get(from as Square);
    return there && there.color === colour ? PIECE_NAMES[there.type] : 'pawn';
  }

  private routeFor(colour: Color, first: string, rest: string[]): PlanArrow[] | null {
    const arrows: PlanArrow[] = [];
    const startSquare = first.slice(-2) as Square;
    const there = this.base.get(startSquare);
    const letter = /^[KQRBN]/.exec(first)?.[0]?.toLowerCase();
    const startsOnPiece = there && there.color === colour && (!letter || there.type === letter);

    if (startsOnPiece) {
      // "d3-d4", "Nf3-d2-f1": the piece is already on the first square.
      let from: string = startSquare;
      for (const leg of rest) {
        const to = leg.slice(-2);
        const step = this.step(colour, leg.length > 2 ? leg : { from, to });
        if (!step) return null;
        arrows.push({ from: leg.length > 2 ? step.move.from : from, to, later: step.later });
        from = to;
      }
      return arrows;
    }

    if (letter) {
      // "Nbd2-f1-g3": the first leg is a move, the rest follow the piece.
      const step = this.step(colour, first);
      if (!step) return null;
      arrows.push({ from: step.move.from, to: step.move.to, later: step.later });
      let from: string = step.move.to;
      for (const leg of rest) {
        const to = leg.slice(-2);
        const next = this.step(colour, leg.length > 2 ? leg : { from, to });
        if (!next) return null;
        arrows.push({ from: leg.length > 2 ? next.move.from : from, to, later: true });
        from = to;
      }
      return arrows;
    }

    // "a3-b4", "b4-b5": nothing of ours on the first square, so each square is
    // a move of its own.
    for (const square of [first, ...rest]) {
      const step = this.step(colour, square);
      if (!step) return null;
      arrows.push({ from: step.move.from, to: step.move.to, later: step.later });
    }
    return arrows;
  }

  square(text: string, square: Square): PlanReference {
    const colour: Color | null = this.side === 'white' ? 'w' : this.side === 'black' ? 'b' : null;
    const rings = colour ? this.base.attackers(square, colour) : [];
    return {
      text,
      kind: 'square',
      status: 'now',
      arrows: [],
      highlight: [square],
      rings,
      description: rings.length
        ? `The ${square} square, and the ${COLOUR_NAME[colour as Color]} pieces that already control it`
        : `The ${square} square`,
    };
  }

  piece(text: string, square: Square, name: string): PlanReference {
    const there = this.base.get(square);
    const type = PIECE_BY_NAME[name.toLowerCase()];
    if (!there || there.type !== type) {
      // "the g2-bishop" before the bishop gets there: show where it is going.
      const san = type === 'p' ? square : `${type.toUpperCase()}${square}`;
      const turn = this.base.turn();
      const colours = this.colours(false);
      if (colours.length === 1) colours.push(colours[0] === 'w' ? 'b' : 'w');
      for (const colour of colours.length ? colours : [turn]) {
        const step = this.step(colour, san);
        if (!step) continue;
        return {
          text,
          kind: 'piece',
          status: 'later',
          arrows: [{ from: step.move.from, to: step.move.to, later: true }],
          highlight: [square],
          rings: [],
          description: `The ${COLOUR_NAME[colour]} ${PIECE_NAMES[type]}, once it reaches ${square}`,
        };
      }
      return invalid(
        text,
        'piece',
        `There is no ${name.toLowerCase()} on ${square}, or on its way`
      );
    }
    return {
      text,
      kind: 'piece',
      status: 'on-board',
      arrows: [],
      highlight: [],
      rings: [square],
      description: `The ${COLOUR_NAME[there.color]} ${PIECE_NAMES[there.type]} on ${square}`,
    };
  }
}

/** Splits a plan into plain text and the references it names, each checked. */
export function parsePlan(fen: string, plan: string): ParsedPlan {
  const { side, text } = classifyPlan(plan);
  let reader: PlanReader;
  try {
    reader = new PlanReader(fen, side);
  } catch {
    return { side, text, segments: [text] };
  }

  const segments: PlanSegment[] = [];
  let last = 0;
  let previous: PlanReference | null = null;
  let previousEnd = 0;
  for (const match of text.matchAll(TOKEN)) {
    const groups = match.groups ?? {};
    const at = match.index ?? 0;
    const before = text.slice(0, at);
    const gap = text.slice(previousEnd, at);
    const after = text.slice(at + match[0].length);
    const named = NAMED_SIDE.exec(before)?.[1]?.toLowerCase();
    const namedColour: Color | null = named === 'white' ? 'w' : named === 'black' ? 'b' : null;
    // "the d4 and d5 squares", "to f4 or g5": a list carries on what it started.
    const inSquareList = previous?.kind === 'square' && LIST_GAP.test(gap);
    const answersPrevious =
      previous !== null &&
      (previous.status === 'now' || previous.status === 'later') &&
      previous.kind === 'move' &&
      /^\s+$/.test(gap);
    let ref: PlanReference;

    if (groups.breakSq) {
      ref = { ...reader.move(groups.breakSq, { named: namedColour }), text: match[0] };
    } else if (groups.pieceSq) {
      ref = reader.piece(match[0], groups.pieceSq as Square, groups.pieceName);
    } else if (groups.square) {
      ref = reader.square(match[0], groups.square as Square);
    } else if (groups.route) {
      // "the a2-g8 diagonal" names a line, which this version leaves as text.
      if (/^[- ]diagonal/i.test(after)) continue;
      ref = reader.route(match[0], namedColour);
    } else if (groups.castle) {
      ref = reader.move(match[0], { named: namedColour });
    } else {
      const token = match[0];
      if (/^[a-h][1-8]$/.test(token) && (SQUARE_CONTEXT.test(before) || inSquareList)) {
        ref = reader.square(token, token as Square);
      } else {
        ref = reader.move(token, { named: namedColour });
        if (ref.status === 'invalid' && answersPrevious) {
          const answer = reader.move(token, { reply: true });
          if (answer.status !== 'invalid') ref = answer;
        }
      }
    }
    previous = ref;
    previousEnd = at + match[0].length;

    // A numbered move that can't be played is the line's history ("after
    // 4.dxc3"); ledger.js already checks those against the opening's moves.
    if (MOVE_NUMBER.test(before) && ref.status !== 'now' && ref.status !== 'later') continue;

    if (at > last) segments.push(text.slice(last, at));
    segments.push(ref);
    last = at + match[0].length;
  }
  if (last < text.length) segments.push(text.slice(last));
  return { side, text, segments };
}
