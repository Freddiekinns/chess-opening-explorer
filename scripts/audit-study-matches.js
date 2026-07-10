#!/usr/bin/env node

/**
 * Audit study → opening match quality in api/data/courses.json.
 *
 * Reads both the legacy v1 schema (course_title/source_url per chapter) and
 * the v2 schema (study_title/match.score per study) so the same script
 * measures before and after a rematch:
 *
 *   1. Coverage — pages with >=1 study: all pages, top-200 and top-1000
 *      most-played (popularity_stats.json).
 *   2. Cross-family contamination — entries whose title names only families
 *      that move-prefix-conflict with the page's family.
 *   3. Duplication — same study appearing more than once on one page.
 *   4. Title duplication — study name repeated inside the display title.
 *   5. Ranking ties — pages whose displayed top-5 contains equal sort keys.
 *
 * Usage: node scripts/audit-study-matches.js [coursesPath] [--json]
 * No API keys required; runs in a few seconds.
 */

const fs = require('fs');
const path = require('path');
const {
  getFamilyFromEco,
  getFamiliesFromTitle,
  compareFamilies,
} = require('../tools/video-pipeline/lib/opening-families');

const DEFAULT_COURSES = path.join(__dirname, '..', 'api', 'data', 'courses.json');
const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const POPULARITY_PATH = path.join(__dirname, '..', 'api', 'data', 'popularity_stats.json');
const DISPLAYED_TOP_N = 5; // StudiesGallery's INITIAL_DISPLAY_COUNT

function loadEco() {
  const eco = {};
  for (const f of ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE']) {
    const p = path.join(ECO_DIR, `${f}.json`);
    if (fs.existsSync(p)) Object.assign(eco, JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  return eco;
}

function detectSchema(entries) {
  const first = entries && entries[0];
  return first && first.study_title ? 'v2' : 'v1';
}

function entryStudyKey(entry) {
  if (entry.study_url) return entry.study_url;
  const m = (entry.source_url || '').match(/study\/([^/]+)/);
  return m ? m[1] : entry.course_title || '';
}

function entryDisplayTitle(entry) {
  return entry.study_title || entry.course_title || '';
}

function hasTitleDuplication(entry) {
  if (entry.study_title !== undefined) {
    // v2 cards render study_title alone, so only an unstripped strict-prefix
    // concatenation in chapter_title counts (a chapter legitimately named
    // exactly like the study is not a display dupe).
    const study = (entry.study_title || '').trim().toLowerCase();
    const chapter = (entry.chapter_title || '').trim().toLowerCase();
    return Boolean(study && chapter && chapter.length > study.length && chapter.startsWith(study));
  }
  const parts = (entry.course_title || '').split(' - ');
  return (
    parts.length >= 2 &&
    parts[1].trim().toLowerCase().startsWith(parts[0].trim().toLowerCase().slice(0, 20))
  );
}

function audit(coursesPath = DEFAULT_COURSES) {
  const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
  const eco = loadEco();
  const allEntries = Object.values(courses).flat();
  const schema = detectSchema(allEntries);

  let totalEntries = 0;
  let contaminationCount = 0;
  let duplicateStudyEntries = 0;
  let titleDuplicationCount = 0;
  let rankingTies = 0;
  let maxEntriesPerPage = 0;
  const studies = new Set();
  const contaminationExamples = [];

  for (const [fen, entries] of Object.entries(courses)) {
    const opening = eco[fen];
    const pageFamily = opening ? getFamilyFromEco(opening.eco) : null;
    maxEntriesPerPage = Math.max(maxEntriesPerPage, entries.length);

    const perStudy = new Map();
    for (const entry of entries) {
      totalEntries++;
      const key = entryStudyKey(entry);
      studies.add(key);
      perStudy.set(key, (perStudy.get(key) || 0) + 1);
      if (hasTitleDuplication(entry)) titleDuplicationCount++;

      const families = getFamiliesFromTitle(entryDisplayTitle(entry));
      if (
        pageFamily &&
        families.length > 0 &&
        families.every((f) => compareFamilies(f, pageFamily) === 'conflict')
      ) {
        contaminationCount++;
        if (contaminationExamples.length < 10 && opening) {
          contaminationExamples.push(
            `[${opening.eco}] ${opening.name} <= ${entryDisplayTitle(entry).slice(0, 70)}`
          );
        }
      }
    }
    for (const n of perStudy.values()) if (n > 1) duplicateStudyEntries += n - 1;

    const top = entries.slice(0, DISPLAYED_TOP_N);
    const keys = top.map((e) => (e.match ? `${e.match.score}|${e.likes || 0}` : `${e.likes || 0}`));
    if (new Set(keys).size < keys.length) rankingTies++;
  }

  const ecoFens = Object.keys(eco);
  const covered = ecoFens.filter((fen) => (courses[fen] || []).length > 0).length;

  let coverageTop200Pct = null;
  let coverageTop1000Pct = null;
  if (fs.existsSync(POPULARITY_PATH)) {
    const popularity = JSON.parse(fs.readFileSync(POPULARITY_PATH, 'utf8')).positions || {};
    const ranked = Object.entries(popularity).sort(
      (a, b) => (b[1].frequency_count || 0) - (a[1].frequency_count || 0)
    );
    const pct = (n) => {
      const top = ranked.slice(0, n);
      const hit = top.filter(([fen]) => (courses[fen] || []).length > 0).length;
      return Math.round((hit / n) * 1000) / 10;
    };
    coverageTop200Pct = pct(200);
    coverageTop1000Pct = pct(1000);
  }

  return {
    schema,
    totalEntries,
    totalStudies: studies.size,
    fensCovered: Object.keys(courses).length,
    coverageAllPct: Math.round((covered / ecoFens.length) * 1000) / 10,
    coverageTop200Pct,
    coverageTop1000Pct,
    contaminationCount,
    contaminationPct: totalEntries
      ? Math.round((contaminationCount / totalEntries) * 1000) / 10
      : 0,
    contaminationExamples,
    duplicateStudyEntries,
    titleDuplicationCount,
    rankingTies,
    maxEntriesPerPage,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const pathArg = args.find((a) => !a.startsWith('--'));
  const metrics = audit(pathArg || DEFAULT_COURSES);
  if (jsonMode) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(`Schema: ${metrics.schema}`);
    console.log(
      `Studies: ${metrics.totalStudies}  Entries: ${metrics.totalEntries}  Pages covered: ${metrics.fensCovered}`
    );
    console.log(
      `Coverage: ${metrics.coverageAllPct}% all | ${metrics.coverageTop200Pct}% top-200 | ${metrics.coverageTop1000Pct}% top-1000`
    );
    console.log(
      `Contamination: ${metrics.contaminationCount} (${metrics.contaminationPct}%)  Dupes: ${metrics.duplicateStudyEntries}  Title dupes: ${metrics.titleDuplicationCount}`
    );
    console.log(
      `Ranking ties (top-${DISPLAYED_TOP_N}): ${metrics.rankingTies}  Max entries/page: ${metrics.maxEntriesPerPage}`
    );
    if (metrics.contaminationExamples.length > 0) {
      console.log('\nContamination examples:');
      for (const ex of metrics.contaminationExamples) console.log(`  ${ex}`);
    }
  }
}

module.exports = { audit, detectSchema };
