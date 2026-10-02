/**
 * Jev rejection filter — removes a displayed video from an opening's page when
 * Jev (TypeSafe's typed decision model) says the video is not about it.
 *
 * Only confident rejections act. In the 2026-10-02 experiment
 * (docs/proposals/2026-10-02-jev-video-experiment.md) 99% of Jev's rejections
 * were real bad matches, but half of what it accepted was still wrong, so its
 * acceptances are not used to rank. A page left with no videos falls back to
 * the API's labelled family shelf (family-resource-service.js).
 *
 * Every failure keeps today's video: no key, an outage, a missing answer or a
 * video whose text is not in the corpus. Answers are cached per video and
 * named opening, so a monthly run only pays for new pairs.
 */

const crypto = require('crypto');
const fs = require('fs');

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
// Pinned: the experiment's answers, which seed the cache, came from this model.
const MODEL = 'jev-1.13.0';
const REJECT = new Set(['mentioned_only', 'not_about']);
// A rejection acts only below this P(main_subject + covered). In the judged
// sample every good match Jev rejected sat at or above it; just above it sit
// parent-variation lectures on their own deep sub-lines (Scheveningen on the
// Scheveningen Fianchetto, ~0.49), which the owner counted as useful.
const REJECT_BELOW = 0.4;
// Keeps a call near 9k tokens, well inside Jev's 64k request limit.
const QUESTIONS_PER_CALL = 40;
const MAX_CONSECUTIVE_FAILURES = 20;

/** A failure no retry can fix: stop asking rather than repeat it per call. */
class FatalJevError extends Error {}

/**
 * The named opening a page belongs to. Only a trailing move list is stripped
 * ("Vienna: Frankenstein-Dracula, 11.d3"): in "Nimzo-Indian: 4.Bd2" the moves
 * are the variation's name.
 */
function baseName(name) {
  const parts = name.split(', ');
  while (parts.length > 1 && /^\d+\./.test(parts.at(-1).trim())) parts.pop();
  return parts.join(', ');
}

/** Named opening → "Name (moves)", using its shortest move order. */
function questionLabels(index, eco) {
  const moves = new Map();
  for (const pos of Object.values(index.positions)) {
    const base = baseName(pos.opening.name);
    const m = (eco[pos.opening.id] && eco[pos.opening.id].moves) || '';
    const best = moves.get(base);
    if (best === undefined || (m && (!best || m.length < best.length))) moves.set(base, m);
  }
  const labels = new Map();
  for (const [base, m] of moves) labels.set(base, m ? `${base} (${m})` : base);
  return labels;
}

/** Short fingerprint of the question asked, so a changed question is re-asked. */
function labelHash(label) {
  return crypto.createHash('sha1').update(label).digest('hex').slice(0, 8);
}

/** The experiment's wording A. Changing it invalidates the cache's meaning. */
function relationQuestion(label) {
  return {
    type: 'choice',
    instructions:
      `How does this chess video relate to the opening ${label}? ` +
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

function durationMinutes(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return null;
  const secs = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return Math.round((secs / 60) * 10) / 10;
}

/** What Jev reads: the video's own text, nothing the matcher decided. */
function videoState(video) {
  return {
    title: video.title,
    channel: video.channelTitle,
    duration_minutes: durationMinutes(video.duration),
    description: video.description || '',
    tags: video.tags || [],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** An `ask(state, questions)` that calls Jev, retrying overload with backoff. */
function createJevAsk(apiKey, { retries = 6, timeoutMs = 90000 } = {}) {
  return async function ask(state, questions) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, model: MODEL, questions }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        if (attempt >= retries) throw err;
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      const body = await res.text();
      if (res.ok) return JSON.parse(body);
      if ([401, 402, 403].includes(res.status)) {
        throw new FatalJevError(`Jev ${res.status}: ${body.slice(0, 300)}`);
      }
      const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
      if (!retryable || attempt >= retries)
        throw new Error(`Jev ${res.status}: ${body.slice(0, 300)}`);
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt + Math.random() * 500);
    }
  };
}

/** Runs `worker` over `items` with at most `limit` in flight. */
async function pool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(runners);
}

/**
 * Asks Jev about every displayed pair without a current cached answer, then
 * removes the pairs it rejects. Mutates `index` and `cache` in place.
 *
 * @param {Object} index - consolidated video index ({positions, metadata})
 * @param {Object} deps
 * @param {Object} deps.eco - fen-keyed ECO data (for move orders)
 * @param {Object} deps.corpus - enrichment cache, id-keyed (the video text)
 * @param {Object} deps.cache - {model, entries: {"<videoId>|<named opening>": {c, p, l}}}
 * @param {Function} [deps.ask] - ask(state, questions); omit to use the cache only
 */
async function filterVideoIndex(index, { eco, corpus, cache, ask, concurrency = 4 }) {
  const labels = questionLabels(index, eco);
  const stats = {
    checked: 0,
    removed: 0,
    unanswered: 0,
    calls: 0,
    inputTokens: 0,
    stoppedEarly: null,
  };

  const current = (videoId, base) => {
    const entry = cache.entries[`${videoId}|${base}`];
    return entry && entry.l === labelHash(labels.get(base)) ? entry : null;
  };

  // Unanswered named openings, grouped per video so each video is one state.
  const missing = new Map();
  for (const pos of Object.values(index.positions)) {
    const base = baseName(pos.opening.name);
    for (const v of pos.videos || []) {
      if (current(v.id, base)) continue;
      if (!missing.has(v.id)) missing.set(v.id, new Set());
      missing.get(v.id).add(base);
    }
  }

  if (ask) {
    const calls = [];
    for (const [videoId, bases] of missing) {
      if (!corpus[videoId]) continue;
      const sorted = [...bases].sort();
      for (let i = 0; i < sorted.length; i += QUESTIONS_PER_CALL) {
        calls.push({ videoId, bases: sorted.slice(i, i + QUESTIONS_PER_CALL) });
      }
    }
    let consecutive = 0;
    await pool(calls, concurrency, async ({ videoId, bases }) => {
      if (stats.stoppedEarly) return;
      const questions = {};
      bases.forEach((base, i) => (questions[`q${i}`] = relationQuestion(labels.get(base))));
      try {
        const res = await ask(videoState(corpus[videoId]), questions);
        stats.calls++;
        stats.inputTokens += (res.usage && res.usage.input_tokens) || 0;
        bases.forEach((base, i) => {
          const a = res.answers && res.answers[`q${i}`];
          if (!a || typeof a.choice !== 'string' || !a.probabilities) return;
          const p = (a.probabilities.main_subject || 0) + (a.probabilities.covered || 0);
          cache.entries[`${videoId}|${base}`] = {
            c: a.choice,
            p: Math.round(p * 100) / 100,
            l: labelHash(labels.get(base)),
          };
        });
        consecutive = 0;
      } catch (err) {
        consecutive++;
        if (err instanceof FatalJevError) stats.stoppedEarly = err.message;
        else if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
          stats.stoppedEarly = `${consecutive} failed calls in a row (last: ${err.message})`;
        }
      }
    });
  }

  let total = 0;
  for (const pos of Object.values(index.positions)) {
    const base = baseName(pos.opening.name);
    pos.videos = (pos.videos || []).filter((v) => {
      stats.checked++;
      const entry = current(v.id, base);
      if (!entry) {
        stats.unanswered++;
        return true;
      }
      if (REJECT.has(entry.c) && entry.p < REJECT_BELOW) {
        stats.removed++;
        return false;
      }
      return true;
    });
    total += pos.videos.length;
  }

  index.metadata = {
    ...index.metadata,
    totalVideos: total,
    jevFilter: { model: MODEL, removed: stats.removed, unanswered: stats.unanswered },
  };
  return { index, stats };
}

function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return { model: MODEL, entries: {} };
  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

/** One entry per line, sorted, so a monthly run's diff shows only new pairs. */
function saveCache(cachePath, cache) {
  const keys = Object.keys(cache.entries).sort();
  const lines = keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(cache.entries[k])}`);
  fs.writeFileSync(
    cachePath,
    `{\n  "model": ${JSON.stringify(cache.model)},\n  "entries": {\n${lines.join(',\n')}\n  }\n}\n`
  );
}

module.exports = {
  MODEL,
  FatalJevError,
  baseName,
  questionLabels,
  labelHash,
  relationQuestion,
  videoState,
  createJevAsk,
  filterVideoIndex,
  loadCache,
  saveCache,
};
