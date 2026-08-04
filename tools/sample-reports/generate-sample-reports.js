#!/usr/bin/env node
/**
 * Regenerates the sample reports offered on the Analyse blank state.
 *
 * These are real public games, so they go stale: the page prints the
 * `generatedAt` date beside the report for exactly that reason. Re-run this
 * when the date starts to look embarrassing.
 *
 * Reads ECO data and the platform services directly — no dev server needed.
 * `packages/shared` must be built first (its `dist/` is not committed); the
 * npm script does that for you.
 *
 *   npm run sample:generate
 */
const fs = require('fs');
const path = require('path');

const ECOService = require('../../packages/api/src/services/eco-service');
const {
  getLichessGamesPgnRatedCached,
} = require('../../packages/api/src/services/personal-games-service');
const {
  getChessComGamesPgnCached,
} = require('../../packages/api/src/services/chesscom-games-service');

const SAMPLES = [
  { id: 'magnus', label: 'Magnus', platform: 'lichess', username: 'DrNykterstein', limit: 100 },
  { id: 'hikaru', label: 'Hikaru', platform: 'chess.com', username: 'Hikaru', limit: 100 },
];

const OUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'packages',
  'web',
  'src',
  'data',
  'sample-reports'
);

async function main() {
  // Leaf modules, not `dist/index.js`: the shared package's top-level barrels
  // (`index.ts`, `types/index.ts`) re-export without file extensions, which
  // Node's ESM resolver rejects. Vite rewrites those for the web build, so the
  // breakage only shows up here. These two files import with extensions and
  // load cleanly.
  const { buildOpeningsMap } = await import('../../packages/shared/dist/utils/pgn-utils.js');
  const { analyseGames } = await import('../../packages/shared/dist/utils/personal-analysis.js');

  const openings = new ECOService().getAllOpenings().map((o) => ({
    fen: o.fen,
    name: o.name,
    eco: o.eco,
    moves: o.moves || '',
    family_id: o.family_id,
  }));
  const openingsMap = buildOpeningsMap(openings);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString().slice(0, 10);

  for (const sample of SAMPLES) {
    const fetchGames =
      sample.platform === 'lichess' ? getLichessGamesPgnRatedCached : getChessComGamesPgnCached;

    process.stdout.write(`Fetching ${sample.username} (${sample.platform})... `);
    const result = await fetchGames({ username: sample.username, limit: sample.limit });
    const gamesPgn = result.gamesPgn || [];
    process.stdout.write(`${gamesPgn.length} games\n`);

    if (gamesPgn.length === 0) {
      throw new Error(
        `No games returned for ${sample.username} - refusing to write an empty sample`
      );
    }

    const dashboard = await analyseGames(gamesPgn, sample.username, openingsMap, {
      yieldEvery: 0,
    });

    const payload = {
      id: sample.id,
      label: sample.label,
      platform: sample.platform,
      username: sample.username,
      gamesRequested: sample.limit,
      generatedAt,
      dashboard,
    };

    const file = path.join(OUT_DIR, `${sample.id}.json`);
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
    process.stdout.write(
      `  wrote ${path.relative(process.cwd(), file)} - ${dashboard.classifiedGames} matched, ` +
        `${dashboard.unclassifiedGames} unrecognised\n`
    );
  }
}

main().catch((error) => {
  process.exitCode = 1;
  process.stderr.write(`${error.stack || error.message}\n`);
});
