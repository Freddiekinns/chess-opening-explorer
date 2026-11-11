#!/usr/bin/env node

/**
 * Audit video → opening match quality in the consolidated video index.
 *
 * Computes the regression metrics from
 * docs/reviews/2026-06-13-video-pipeline-assessment.md against the live
 * api/data/video-index.json — run it before and after any scorer change
 * (followed by `npm run pipeline:rematch`) to verify the change helped:
 *
 *   1. Coverage — openings with >=1 video, overall and for the 200
 *      most-played positions (popularity_stats.json).
 *   2. Variation specificity — share of sub-variation pages whose #1 / top-3
 *      videos actually mention the variation.
 *   3. Cross-family contamination — matches whose video title names a
 *      different opening family than the page (move-prefix compatibility,
 *      same logic as the matcher).
 *   4. Ranking ties — pages with tied scores inside the displayed top 4.
 *   5. Index age in days.
 *
 *   6. Coverage by name prefix, family root pages led by a variation video,
 *      and how concentrated the #1 slots are across channels.
 *
 * Usage: node scripts/audit-video-matches.js [--json]
 * No API keys required; runs in a few seconds.
 */

const fs = require('fs');
const path = require('path');
const {
  getFamilyFromEco,
  getFamiliesFromTitle,
  compareFamilies,
} = require('../tools/video-pipeline/lib/opening-families');
const { sanitizeFenKey, legacySanitizeFenKey } = require('../packages/api/src/utils/fen-sanitizer');
const {
  getVariationWords,
  titleMentionsVariation,
} = require('../packages/api/src/utils/variation-words');

const INDEX_PATH = path.join(__dirname, '..', 'api', 'data', 'video-index.json');
const POPULARITY_PATH = path.join(__dirname, '..', 'api', 'data', 'popularity_stats.json');

const TOP_PLAYED_SAMPLE = 200;
const DISPLAYED_TOP_N = 4; // VideoGallery's INITIAL_DISPLAY_COUNT
const MIN_PREFIX_PAGES = 20; // fewer pages than this is not a naming pattern
const LOW_PREFIX_COVERAGE_PCT = 50;

function audit(indexPath = INDEX_PATH) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const positions = Object.values(index.positions || {});

  // ── 1. Coverage ────────────────────────────────────────────
  const withVideos = positions.filter((p) => (p.videos || []).length > 0).length;

  let topPlayedFound = 0;
  let topPlayedCovered = 0;
  const popularMisses = [];
  if (fs.existsSync(POPULARITY_PATH)) {
    const popularity = JSON.parse(fs.readFileSync(POPULARITY_PATH, 'utf8')).positions || {};
    const ranked = Object.entries(popularity).sort(
      (a, b) => (b[1].frequency_count || 0) - (a[1].frequency_count || 0)
    );
    for (const [fen] of ranked.slice(0, TOP_PLAYED_SAMPLE)) {
      const entry =
        index.positions[sanitizeFenKey(fen)] || index.positions[legacySanitizeFenKey(fen)];
      if (!entry) continue;
      topPlayedFound++;
      if ((entry.videos || []).length > 0) topPlayedCovered++;
      else popularMisses.push(entry.opening.name);
    }
  }

  // ── 2. Variation specificity ───────────────────────────────
  let subVariationPages = 0;
  let top1Specific = 0;
  let top3Specific = 0;

  // ── 3. Cross-family contamination ──────────────────────────
  let familyDetectable = 0;
  let crossFamily = 0;
  const crossFamilyExamples = [];

  // ── 4. Ranking ties in displayed slots ─────────────────────
  let multiVideoPages = 0;
  let pagesWithTopTies = 0;

  // ── 5. Coverage by name prefix ─────────────────────────────
  // Coverage that tracks how a page is named rather than whether videos
  // exist: "QGD: …" sat at 5% beside "Sicilian: …" at 99% until the family
  // path stopped depending on the page's literal name.
  const prefixes = new Map();

  // ── 6. Family root pages ───────────────────────────────────
  let rootPagesWithVideos = 0;
  let rootLedByVariation = 0;

  // ── 7. Creators ────────────────────────────────────────────
  const firstSlots = new Map();
  const channelsShown = new Set();

  for (const position of positions) {
    const videos = position.videos || [];
    const name = position.opening.name || '';
    const colonIndex = name.indexOf(':');

    if (colonIndex !== -1) {
      const prefix = name.slice(0, colonIndex);
      const tally = prefixes.get(prefix) || { pages: 0, covered: 0 };
      tally.pages++;
      if (videos.length > 0) tally.covered++;
      prefixes.set(prefix, tally);
    }

    if (videos.length === 0) continue;

    if (colonIndex === -1) {
      rootPagesWithVideos++;
      if (videos[0].level === 'variation') rootLedByVariation++;
    }

    for (const video of videos) channelsShown.add(video.channel);
    firstSlots.set(videos[0].channel, (firstSlots.get(videos[0].channel) || 0) + 1);

    const variationWords = getVariationWords(name);
    if (variationWords.length > 0) {
      subVariationPages++;
      const mentions = (video) => titleMentionsVariation(video.title, variationWords);
      if (mentions(videos[0])) top1Specific++;
      if (videos.slice(0, 3).some(mentions)) top3Specific++;
    }

    const openingFamily = getFamilyFromEco(position.opening.eco);
    if (openingFamily) {
      for (const video of videos) {
        const videoFamilies = getFamiliesFromTitle(video.title || '');
        if (videoFamilies.length === 0) continue;
        familyDetectable++;
        // Multi-opening titles conflict only when every named family does
        // (same rule as the matcher)
        if (videoFamilies.every((f) => compareFamilies(f, openingFamily) === 'conflict')) {
          crossFamily++;
          if (crossFamilyExamples.length < 10) {
            crossFamilyExamples.push({
              page: `${name} (${position.opening.eco})`,
              video: video.title,
              score: video.score ?? video.match_score,
            });
          }
        }
      }
    }

    if (videos.length >= 2) {
      multiVideoPages++;
      // Ordering is ambiguous only when the full ranking key ties — score,
      // then view count, then publish date (the matcher's tiebreakers)
      const rankKeys = videos
        .slice(0, DISPLAYED_TOP_N)
        .map((v) => `${v.score ?? v.match_score}|${v.views ?? v.view_count}|${v.published}`);
      if (new Set(rankKeys).size < rankKeys.length) pagesWithTopTies++;
    }
  }

  const generatedAt = index.generated ? new Date(index.generated) : null;
  const indexAgeDays = generatedAt
    ? Math.floor((Date.now() - generatedAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const pct = (numerator, denominator) =>
    denominator > 0 ? +((100 * numerator) / denominator).toFixed(1) : null;

  const worstPrefixes = [...prefixes.entries()]
    .filter(([, tally]) => tally.pages >= MIN_PREFIX_PAGES)
    .map(([prefix, tally]) => ({ prefix, ...tally, covered_pct: pct(tally.covered, tally.pages) }))
    .filter((entry) => entry.covered_pct < LOW_PREFIX_COVERAGE_PCT)
    .sort((a, b) => b.pages - b.covered - (a.pages - a.covered))
    .slice(0, 10);

  const pagesWithVideos = positions.filter((p) => (p.videos || []).length > 0).length;
  const rankedFirstSlots = [...firstSlots.entries()].sort((a, b) => b[1] - a[1]);

  return {
    generated_at: index.generated || null,
    index_age_days: indexAgeDays,
    coverage: {
      openings_total: positions.length,
      openings_with_videos: withVideos,
      openings_with_videos_pct: pct(withVideos, positions.length),
      top_played_sample: TOP_PLAYED_SAMPLE,
      top_played_found_in_index: topPlayedFound,
      top_played_covered: topPlayedCovered,
      top_played_covered_pct: pct(topPlayedCovered, topPlayedFound),
      popular_misses: popularMisses.slice(0, 20),
      worst_prefixes: worstPrefixes,
    },
    root_pages: {
      root_pages_with_videos: rootPagesWithVideos,
      led_by_variation_video: rootLedByVariation,
      led_by_variation_video_pct: pct(rootLedByVariation, rootPagesWithVideos),
    },
    creators: {
      channels_shown: channelsShown.size,
      top3_share_of_first_slots_pct: pct(
        rankedFirstSlots.slice(0, 3).reduce((sum, [, count]) => sum + count, 0),
        pagesWithVideos
      ),
      first_slots: rankedFirstSlots.slice(0, 8).map(([channel, count]) => ({
        channel,
        first_slots: count,
        pct: pct(count, pagesWithVideos),
      })),
    },
    variation_specificity: {
      sub_variation_pages: subVariationPages,
      top1_mentions_variation: top1Specific,
      top1_mentions_variation_pct: pct(top1Specific, subVariationPages),
      top3_mentions_variation: top3Specific,
      top3_mentions_variation_pct: pct(top3Specific, subVariationPages),
    },
    cross_family: {
      family_detectable_matches: familyDetectable,
      cross_family_matches: crossFamily,
      cross_family_pct: pct(crossFamily, familyDetectable),
      examples: crossFamilyExamples,
    },
    ranking_ties: {
      pages_with_2plus_videos: multiVideoPages,
      pages_with_ties_in_top4: pagesWithTopTies,
      pages_with_ties_in_top4_pct: pct(pagesWithTopTies, multiVideoPages),
    },
  };
}

function main() {
  const report = audit();

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('🎬 Video Match Audit');
  console.log('====================');
  console.log(`Index generated: ${report.generated_at} (${report.index_age_days} days old)`);
  console.log('');
  console.log('Coverage');
  console.log(
    `  Openings with videos:        ${report.coverage.openings_with_videos}/${report.coverage.openings_total} (${report.coverage.openings_with_videos_pct}%)`
  );
  console.log(
    `  Top-${report.coverage.top_played_sample} played covered:      ${report.coverage.top_played_covered}/${report.coverage.top_played_found_in_index} (${report.coverage.top_played_covered_pct}%)  [target >90%]`
  );
  for (const entry of report.coverage.worst_prefixes.slice(0, 6)) {
    console.log(
      `    ${entry.covered}/${entry.pages} (${entry.covered_pct}%)  "${entry.prefix}: …"`
    );
  }
  console.log('');
  console.log('Family root pages');
  console.log(
    `  Led by a variation video:    ${report.root_pages.led_by_variation_video}/${report.root_pages.root_pages_with_videos} (${report.root_pages.led_by_variation_video_pct}%)`
  );
  console.log('');
  console.log('Creators');
  console.log(
    `  Top 3 channels' #1 slots:    ${report.creators.top3_share_of_first_slots_pct}%  (${report.creators.channels_shown} channels shown)`
  );
  for (const entry of report.creators.first_slots.slice(0, 5)) {
    console.log(`    ${entry.pct}%  ${entry.channel}`);
  }
  console.log('');
  console.log('Variation specificity (sub-variation pages)');
  console.log(
    `  #1 video names variation:    ${report.variation_specificity.top1_mentions_variation_pct}%  [target >60%]`
  );
  console.log(
    `  Top-3 names variation:       ${report.variation_specificity.top3_mentions_variation_pct}%`
  );
  console.log('');
  console.log('Cross-family contamination');
  console.log(
    `  Conflicting-family matches:  ${report.cross_family.cross_family_matches}/${report.cross_family.family_detectable_matches} (${report.cross_family.cross_family_pct}%)  [target <1%]`
  );
  for (const example of report.cross_family.examples.slice(0, 5)) {
    console.log(`    [${example.score}] ${example.page}  <=  ${example.video}`);
  }
  console.log('');
  console.log('Ranking');
  console.log(
    `  Pages with ties in top 4:    ${report.ranking_ties.pages_with_ties_in_top4}/${report.ranking_ties.pages_with_2plus_videos} (${report.ranking_ties.pages_with_ties_in_top4_pct}%)  [target <20%]`
  );
  if (report.index_age_days !== null && report.index_age_days > 14) {
    console.log('');
    console.log(
      `⚠️  Index is ${report.index_age_days} days old — RSS only covers each channel's ~15 latest`
    );
    console.log('   uploads, so long gaps permanently miss videos. Run: npm run pipeline');
  }
}

if (require.main === module) {
  main();
}

module.exports = { audit };
