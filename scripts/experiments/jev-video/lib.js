/**
 * Shared plumbing for the Jev video experiment
 * (docs/proposals/2026-10-02-jev-video-experiment.md).
 *
 * Reads the video index, the enrichment cache and the ECO data; never writes
 * them. Answers are appended to JSON Lines under tools/data/experiments/, one
 * line per call as it returns, so a re-run skips what is already answered.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const DATA = path.join(ROOT, 'api', 'data');
const CACHE_PATH = path.join(ROOT, 'tools', 'data', 'video_enrichment_cache.json');
const OUT_DIR = path.join(ROOT, 'tools', 'data', 'experiments');

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
// Pinned: `jev-latest` resolved to this for the pilot, and a resumed run must
// not mix versions.
const MODEL = 'jev-1.13.0';
const PRICE_PER_M_INPUT = 0.042; // USD, docs.typesafe.ai/models, 2026-10-02

// ── Data ──────────────────────────────────────────────────────────

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadCorpus() {
  return readJson(CACHE_PATH);
}

function loadIndex() {
  return readJson(path.join(DATA, 'video-index.json'));
}

function loadFamilies() {
  return readJson(path.join(DATA, 'families.json'));
}

function loadEco() {
  const eco = {};
  for (const letter of 'ABCDE') {
    Object.assign(eco, readJson(path.join(DATA, 'eco', `eco${letter}.json`)));
  }
  return eco;
}

/**
 * Page names carry move-order suffixes ("Vienna: Frankenstein-Dracula, 11.d3")
 * that no video's text will ever name. Questions are asked about the named
 * opening instead, and the answer applies to every position that shares it.
 */
function baseName(name) {
  // Only a trailing move list is stripped. In "Scotch: 4.Nxd4 Qf6" or
  // "Nimzo-Indian: 4.Bd2" the moves are the variation's name, not noise.
  const parts = name.split(', ');
  while (parts.length > 1 && /^\d+\./.test(parts.at(-1).trim())) parts.pop();
  return parts.join(', ');
}

/**
 * Groups the displayed (video, page) pairs by named opening.
 * Returns { openings: Map<base, {name, eco, moves, positions}>, pairs: Map<videoId, Set<base>> }.
 */
function buildDisplayedPairs(index, eco) {
  const openings = new Map();
  const pairs = new Map();
  for (const [key, pos] of Object.entries(index.positions)) {
    const base = baseName(pos.opening.name);
    const moves = (eco[pos.opening.id] && eco[pos.opening.id].moves) || '';
    const existing = openings.get(base);
    if (!existing) {
      openings.set(base, { name: base, eco: pos.opening.eco, moves, positions: [key] });
    } else {
      existing.positions.push(key);
      // The shortest move order is the most typical way to reach the name.
      if (moves && (!existing.moves || moves.length < existing.moves.length))
        existing.moves = moves;
    }
    for (const v of pos.videos || []) {
      if (!pairs.has(v.id)) pairs.set(v.id, new Set());
      pairs.get(v.id).add(base);
    }
  }
  return { openings, pairs };
}

function durationMinutes(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return null;
  const secs = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return Math.round((secs / 60) * 10) / 10;
}

/** What Jev reads: the video's own text and nothing the matcher decided. */
function videoState(video) {
  return {
    title: video.title,
    channel: video.channelTitle,
    duration_minutes: durationMinutes(video.duration),
    description: video.description || '',
    tags: video.tags || [],
  };
}

// ── Questions ─────────────────────────────────────────────────────

function openingLabel(opening) {
  return opening.moves ? `${opening.name} (${opening.moves})` : opening.name;
}

/** Run 1, wording A — the proposal's four answers. */
function relationQuestion(opening) {
  return {
    type: 'choice',
    instructions:
      `How does this chess video relate to the opening ${openingLabel(opening)}? ` +
      "Judge only from the video's title, description and tags.",
    criteria: {
      main_subject: 'The video is mainly about this opening or variation.',
      covered:
        'The video covers this opening as one part of something broader, such as a repertoire, an overview of its opening family, or a game or lesson that features it.',
      mentioned_only:
        'The opening is only mentioned in passing, linked, or tagged; the video is about something else.',
      not_about:
        'The video is about a different opening or variation, or nothing in its text connects it to this opening.',
    },
  };
}

/**
 * Run 1, wording B — same four answers, different words and order. Used only
 * in the pilot, to measure how much Jev's answer depends on phrasing.
 */
function relationQuestionAlt(opening) {
  return {
    type: 'choice',
    instructions:
      `A viewer wants to study ${openingLabel(opening)}. ` +
      "Based on this YouTube video's title, description and tags, how useful is the video for that?",
    criteria: {
      not_about: 'Unrelated: it teaches or shows a different opening or line.',
      mentioned_only: 'Only a passing reference; the opening is not really discussed.',
      covered: 'Partly useful: the opening is one section of a wider video.',
      main_subject: 'Directly useful: this opening is what the video is about.',
    },
  };
}

/** Run 2 — which family is the video mainly about? */
function familyQuestion(families) {
  const criteria = {};
  for (const f of Object.values(families)) {
    criteria[f.id] = `${f.display_name} (ECO ${f.eco_anchor})`;
  }
  criteria.several_or_general =
    'Several different openings, or general opening principles without one main opening.';
  criteria.not_opening =
    'Not an opening video: a game recap, puzzle, endgame, news, or a short clip with no opening subject.';
  return {
    type: 'choice',
    instructions:
      "Which chess opening family is this video mainly about? Judge only from the video's title, description and tags.",
    criteria,
  };
}

// ── API ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A failure no retry can fix: stop the whole run rather than repeat it per call. */
class FatalJevError extends Error {}

function backoffMs(attempt, res) {
  const retryAfter = res && Number(res.headers.get('retry-after'));
  if (retryAfter > 0) return retryAfter * 1000;
  return 1000 * 2 ** attempt + Math.random() * 500;
}

async function askJev(state, questions, { retries = 6, timeoutMs = 90000 } = {}) {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error('JEV_API_KEY is not set in .env');
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, model: MODEL, questions }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(backoffMs(attempt));
      continue;
    }
    const latency_ms = Date.now() - started;
    const body = await res.text();
    if (res.ok) {
      try {
        return { ...JSON.parse(body), latency_ms };
      } catch {
        // Billed but unreadable: surface the text rather than pay again silently.
        throw new Error(`Jev ${res.status} with unparseable body: ${body.slice(0, 500)}`);
      }
    }
    if ([401, 402, 403].includes(res.status)) {
      throw new FatalJevError(`Jev ${res.status}: ${body.slice(0, 500)}`);
    }
    const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      throw new Error(`Jev ${res.status}: ${body.slice(0, 500)}`);
    }
    await sleep(backoffMs(attempt, res));
  }
}

/** Every question answered, with the fields the analysis reads. */
function missingAnswers(questions, res) {
  const answers = res.answers || {};
  const missing = Object.keys(questions).filter((qid) => {
    const a = answers[qid];
    if (!a) return true;
    if (questions[qid].type === 'noul') return typeof a.noul !== 'number';
    return typeof a.choice !== 'string' || !a.probabilities;
  });
  if (!res.usage || typeof res.usage.input_tokens !== 'number') missing.push('usage');
  return missing;
}

// ── Output ────────────────────────────────────────────────────────

function outPath(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return path.join(OUT_DIR, name);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return lines.flatMap((line, i) => {
    try {
      return [JSON.parse(line)];
    } catch (err) {
      // A hard kill can leave half a last line; that call is simply asked again.
      if (i === lines.length - 1) {
        console.warn(`Ignoring a partial last line in ${path.basename(file)}`);
        return [];
      }
      throw err;
    }
  });
}

function appendJsonl(file, record) {
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
}

/** Runs `worker` over `items` with at most `limit` in flight. */
async function pool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

function costUsd(inputTokens) {
  return (inputTokens / 1e6) * PRICE_PER_M_INPUT;
}

/**
 * Asks every planned call not already in `file`, appending one line per
 * answer as it arrives. Returns the number of calls that failed.
 */
async function runCalls(calls, file, { concurrency = 4, maxConsecutiveFailures = 20 } = {}) {
  const done = new Set(readJsonl(file).map((r) => r.key));
  const todo = calls.filter((c) => !done.has(c.key));
  console.log(`Already answered: ${done.size}; calling ${todo.length}`);

  let failed = 0;
  let finished = 0;
  let consecutive = 0;
  let abort = null;
  await pool(todo, concurrency, async (call) => {
    if (abort) return;
    try {
      const res = await askJev(call.state, call.questions);
      const missing = missingAnswers(call.questions, res);
      if (missing.length) throw new Error(`incomplete response, missing ${missing.join(', ')}`);
      appendJsonl(file, {
        key: call.key,
        kind: call.kind,
        video_id: call.video_id,
        meta: call.meta,
        model: res.model,
        answers: res.answers,
        usage: res.usage,
        latency_ms: res.latency_ms,
        at: new Date().toISOString(),
      });
      consecutive = 0;
    } catch (err) {
      failed++;
      consecutive++;
      console.error(`${call.key}: ${err.message}`);
      if (err instanceof FatalJevError) abort = err.message;
      else if (consecutive >= maxConsecutiveFailures) abort = `${consecutive} failures in a row`;
    }
    if (++finished % 500 === 0) console.log(`  ${finished}/${todo.length}`);
  });
  if (abort) console.error(`\nStopped early: ${abort}`);
  return failed;
}

/** Commit and dirty flag of each input file, for the run's manifest. */
function inputVersions(relPaths) {
  const { execFileSync } = require('child_process');
  const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
  const out = { head: git('rev-parse', 'HEAD') };
  for (const p of relPaths) {
    out[p] = {
      commit: git('log', '-1', '--format=%H', '--', p),
      dirty: git('status', '--porcelain', '--', p) !== '',
    };
  }
  return out;
}

function totalTokens(records) {
  return records.reduce((a, r) => a + ((r.usage && r.usage.input_tokens) || 0), 0);
}

module.exports = {
  ROOT,
  MODEL,
  loadCorpus,
  loadIndex,
  loadFamilies,
  loadEco,
  baseName,
  buildDisplayedPairs,
  videoState,
  openingLabel,
  relationQuestion,
  relationQuestionAlt,
  familyQuestion,
  askJev,
  inputVersions,
  outPath,
  readJsonl,
  appendJsonl,
  pool,
  costUsd,
  runCalls,
  totalTokens,
};
