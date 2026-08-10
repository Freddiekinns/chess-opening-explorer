/**
 * Test Suite: Enrichment Corpus
 * The cache is the durable record of everything ever fetched; these tests pin
 * down that re-scoring can read it back without another API call.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadEnrichmentCorpus, cacheEntryToCandidate } = require('../lib/enrichment-corpus');

function writeCache(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-'));
  const cachePath = path.join(dir, 'video_enrichment_cache.json');
  const byId = {};
  for (const entry of entries) byId[entry.id] = entry;
  fs.writeFileSync(cachePath, JSON.stringify(byId));
  return cachePath;
}

const entry = (overrides = {}) => ({
  id: 'vid1',
  title: 'The Accelerated Dragon | Sicilian Defense Theory',
  description: 'Opening theory',
  channelTitle: 'Hanging Pawns',
  publishedAt: '2020-01-01T00:00:00Z',
  duration: 'PT24M15S',
  tags: ['sicilian'],
  viewCount: 251720,
  enrichedAt: '2026-03-15T18:03:56.451Z',
  ...overrides,
});

describe('cacheEntryToCandidate', () => {
  it('maps a cache entry to the shape the matcher consumes', () => {
    const candidate = cacheEntryToCandidate(entry());
    expect(candidate.statistics.viewCount).toBe('251720');
    expect(candidate.duration).toBe('PT24M15S');
    expect(candidate.channelTitle).toBe('Hanging Pawns');
    expect(candidate.tags).toEqual(['sicilian']);
  });

  it('derives the thumbnail URL from the video id', () => {
    // The cache never stored thumbnails; YouTube's are deterministic, and this
    // is the same URL shape already in the videos table.
    expect(cacheEntryToCandidate(entry()).thumbnails.default.url).toBe(
      'https://i.ytimg.com/vi/vid1/default.jpg'
    );
  });

  it('tags the candidate with its channel quality tier', () => {
    expect(cacheEntryToCandidate(entry()).qualityTier).toBe('premium');
    expect(cacheEntryToCandidate(entry({ channelTitle: 'GothamChess' })).qualityTier).toBe(
      'standard'
    );
  });
});

describe('loadEnrichmentCorpus', () => {
  it('recovers videos the videos table no longer holds', () => {
    const cachePath = writeCache([
      entry({ id: 'kept' }),
      entry({ id: 'dropped', title: 'Accelerated Dragon Explained | Chess Opening Theory' }),
    ]);
    const result = loadEnrichmentCorpus({ cachePath, excludeIds: new Set(['kept']) });
    expect(result.videos.map((v) => v.id)).toEqual(['dropped']);
    expect(result.recovered).toBe(1);
  });

  it('applies the same pre-filter discovery does, so junk stays out', () => {
    const cachePath = writeCache([
      entry({ id: 'short', duration: 'PT46S', title: 'Bold Gambit #chess #chesstactics' }),
      entry({ id: 'live', title: 'LIVE: Round 7 of the Candidates Tournament' }),
      entry({ id: 'good' }),
    ]);
    const result = loadEnrichmentCorpus({ cachePath });
    expect(result.videos.map((v) => v.id)).toEqual(['good']);
    expect(result.rejected).toBe(2);
  });

  it('returns an empty corpus when the cache is missing', () => {
    const result = loadEnrichmentCorpus({
      cachePath: path.join(os.tmpdir(), 'no-such-cache.json'),
    });
    expect(result.videos).toEqual([]);
    expect(result.total).toBe(0);
  });
});
