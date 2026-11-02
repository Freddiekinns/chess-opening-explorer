#!/usr/bin/env node
/**
 * Exports the `/opening/…` page views from PostHog as the queue's input.
 *
 *   node tools/content-review/export-views.js [--since 2026-09-24]
 *
 * Reads POSTHOG_PERSONAL_API_KEY (a personal key with Query: Read on project
 * 283180) from the repo's .env, or from the main checkout's .env when run in a
 * worktree, and writes data/content-review/views/<today>.json.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { REPO } = require('./ledger');

const ENDPOINT = 'https://eu.posthog.com/api/projects/283180/query/';
const SOURCE = 'PostHog $pageview, host openingbook.xyz, test devices excluded';

// Raw HogQL ignores the test-account filter, hence the two device IDs. HogQL
// returns 100 rows unless told otherwise.
const query = (since) => `
  select properties.$pathname as p, count() as views, count(distinct person_id) as people
  from events
  where event = '$pageview' and properties.$pathname like '/opening/%'
    and properties.$host = 'openingbook.xyz'
    and not (startsWith(toString(properties.$device_id), 'c21e0f5c')
          or startsWith(toString(properties.$device_id), 'a51c7e4c'))
    and timestamp >= toDateTime('${since} 00:00:00')
  group by p order by views desc
  limit 10000`;

function encodePath(p) {
  try {
    return '/opening/' + encodeURIComponent(decodeURIComponent(p.slice('/opening/'.length)));
  } catch {
    return p;
  }
}

function toViews(results, { since, until }) {
  return {
    source: SOURCE,
    since,
    until,
    pages: results.map(([p, views, people]) => ({ path: encodePath(p), views, people })),
  };
}

function loadKey() {
  dotenv.config({ path: path.join(REPO, '.env'), quiet: true });
  if (!process.env.POSTHOG_PERSONAL_API_KEY) {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: REPO })
      .toString()
      .trim();
    dotenv.config({ path: path.join(path.resolve(REPO, common), '..', '.env'), quiet: true });
  }
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) throw new Error('POSTHOG_PERSONAL_API_KEY is not set in .env');
  return key;
}

async function main() {
  const args = process.argv.slice(2);
  const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : '2026-09-24';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since must be YYYY-MM-DD');
  const until = new Date().toISOString().slice(0, 10);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loadKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: query(since) } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${body.detail || JSON.stringify(body)}`);

  const views = toViews(body.results, { since, until });
  const out = path.join(REPO, 'data/content-review/views', `${until}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(views, null, 2) + '\n');
  const total = views.pages.reduce((n, p) => n + p.views, 0);
  console.log(`${views.pages.length} paths, ${total} views since ${since}`);
  console.log(`Wrote ${path.relative(REPO, out)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { toViews };
