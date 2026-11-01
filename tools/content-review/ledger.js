/**
 * The content review ledger: which opening pages someone has checked, when,
 * and against which text. See README.md for the runbook.
 *
 * A page is due when it has no entry, when its description or plans changed
 * after the review (the hash no longer matches), or when the review is twelve
 * months old.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const REPO = path.join(__dirname, '../..');
const LEDGER = path.join(REPO, 'data/content-review/ledger.json');
const STALE_MONTHS = 12;
const VERDICTS = ['ok', 'fixed', 'needs-research'];

function contentHash(record) {
  const a = record.analysis_json || {};
  const text = JSON.stringify([a.description || '', a.common_plans || []]);
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function fenFromPath(p) {
  if (!p.startsWith('/opening/')) return null;
  try {
    return decodeURIComponent(p.slice('/opening/'.length).replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

function dueReason(entry, hash, today) {
  if (!entry) return 'unreviewed';
  if (entry.contentHash !== hash) return 'changed';
  const stale = new Date(entry.reviewedAt);
  stale.setUTCMonth(stale.getUTCMonth() + STALE_MONTHS);
  return new Date(today) >= stale ? 'stale' : null;
}

// Board, side, castling and en passant: the move counters vary between links
// to the same position.
const positionKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

function buildQueue({ pages, ledger, records, today, top }) {
  const byPosition = new Map(Object.keys(records).map((fen) => [positionKey(fen), fen]));
  const counts = new Map();
  const unmatched = [];
  for (const page of pages) {
    const decoded = fenFromPath(page.path);
    const fen = decoded && (records[decoded] ? decoded : byPosition.get(positionKey(decoded)));
    if (!fen) {
      unmatched.push(page.path);
      continue;
    }
    const c = counts.get(fen) || { views: 0, people: 0 };
    c.views += page.views;
    c.people += page.people;
    counts.set(fen, c);
  }

  const queue = [];
  for (const [fen, c] of counts) {
    const r = records[fen];
    const reason = dueReason(ledger[fen], contentHash(r), today);
    if (reason) queue.push({ fen, name: r.name, eco: r.eco, ...c, reason });
  }
  queue.sort((a, b) => b.people - a.people || b.views - a.views || a.name.localeCompare(b.name));
  return { queue: queue.slice(0, top), unmatched };
}

function recordReviews(ledger, reviews, records, today) {
  const out = { ...ledger };
  for (const { fen, verdict, notes = '' } of reviews) {
    if (verdict == null) continue;
    if (!VERDICTS.includes(verdict)) throw new Error(`${fen}: verdict must be one of ${VERDICTS}`);
    if (verdict !== 'ok' && !notes) throw new Error(`${fen}: a ${verdict} verdict needs notes`);
    if (!records[fen]) throw new Error(`${fen}: no ECO record`);
    out[fen] = { reviewedAt: today, verdict, contentHash: contentHash(records[fen]), notes };
  }
  return out;
}

const SAN = String.raw`(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?`;
const SEQUENCE = new RegExp(
  String.raw`\b(\d+)\.(\.\.)?\s?(${SAN}(?:\s+(?:\d+\.(?:\.\.)?\s?)?${SAN}(?![\w-]))*)`,
  'g'
);

/**
 * Replays every numbered move sequence in the text ("6.Bg5 e6 7.f4",
 * "4...exd4") from the opening's own moves, and returns the ones that are
 * illegal where the text places them. A sequence numbered past the end of the
 * opening can't be placed and is returned for a check by hand.
 */
function checkMoves(text, moves) {
  const opening = moves
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const problems = [];
  for (const m of text.matchAll(SEQUENCE)) {
    const sequence = `${m[1]}.${m[2] || ''}${m[3]}`;
    const ply = (Number(m[1]) - 1) * 2 + (m[2] ? 1 : 0);
    if (ply > opening.length) {
      problems.push({ sequence, problem: 'starts after the opening ends; check by hand' });
      continue;
    }
    const board = new Chess();
    for (const san of opening.slice(0, ply)) board.move(san);
    for (const san of m[3]
      .replace(/\d+\.(\.\.)?/g, ' ')
      .split(/\s+/)
      .filter(Boolean)) {
      try {
        board.move(san);
      } catch {
        problems.push({ sequence, problem: `${san} is illegal` });
        break;
      }
    }
  }
  return problems;
}

function loadRecords() {
  const records = {};
  for (const letter of 'ABCDE') {
    const file = path.join(REPO, `api/data/eco/eco${letter}.json`);
    Object.assign(records, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return records;
}

const readLedger = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {});
const writeLedger = (ledger) => fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

module.exports = {
  REPO,
  STALE_MONTHS,
  VERDICTS,
  contentHash,
  fenFromPath,
  dueReason,
  buildQueue,
  recordReviews,
  checkMoves,
  loadRecords,
  readLedger,
  writeLedger,
};
