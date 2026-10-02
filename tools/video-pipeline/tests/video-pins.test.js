/**
 * Test Suite: video pins
 * Pins put hand-verified videos on pages the scorer leaves empty. They are
 * applied after the Jev filter, so nothing downstream can remove them, and a
 * pin whose video has left the corpus is skipped rather than shown half-built.
 */

const { applyVideoPins } = require('../lib/video-pins');

const corpus = {
  veresov: {
    id: 'veresov',
    title: 'The Richter-Veresov Attack',
    channelTitle: 'Chess Openings',
    duration: 'PT1H2M5S',
    viewCount: 12000,
    publishedAt: '2023-04-01T10:00:00Z',
  },
  trap: {
    id: 'trap',
    title: 'Veresov trap',
    channelTitle: 'Shorts',
    duration: 'PT45S',
    viewCount: 900,
    publishedAt: '2024-01-01T00:00:00Z',
  },
};

function makeIndex() {
  return {
    positions: {
      empty: {
        opening: { id: 'empty', name: "Queen's Pawn: Veresov Attack" },
        videos: [],
        metadata: { total_videos: 0 },
      },
      deeper: {
        opening: { id: 'deeper', name: "Queen's Pawn: Veresov Attack, 3...Bf5" },
        videos: [
          { id: 'trap', title: 'Veresov trap', score: 40 },
          { id: 'other', score: 30 },
        ],
        metadata: { total_videos: 2 },
      },
      unrelated: {
        opening: { id: 'unrelated', name: 'Owen Defence' },
        videos: [{ id: 'owen', score: 50 }],
        metadata: { total_videos: 1 },
      },
    },
    metadata: { totalVideos: 3 },
  };
}

const pins = { "Queen's Pawn: Veresov Attack": [{ id: 'veresov' }, { id: 'trap' }] };
const ids = (index, key) => index.positions[key].videos.map((v) => v.id);

describe('applyVideoPins', () => {
  test('fills an empty page with its pinned videos, in pin order', () => {
    const index = makeIndex();
    applyVideoPins(index, pins, corpus);

    expect(ids(index, 'empty')).toEqual(['veresov', 'trap']);
  });

  test('builds the entry the API serves from the corpus', () => {
    const index = makeIndex();
    applyVideoPins(index, pins, corpus);

    expect(index.positions.empty.videos[0]).toEqual({
      id: 'veresov',
      title: 'The Richter-Veresov Attack',
      channel: 'Chess Openings',
      duration: 3725,
      views: 12000,
      published: '2023-04-01T10:00:00Z',
      thumbnail: 'https://i.ytimg.com/vi/veresov/default.jpg',
      url: 'https://youtube.com/watch?v=veresov',
      score: 0,
    });
  });

  test('puts pins first on every page of the named opening without duplicating', () => {
    const index = makeIndex();
    applyVideoPins(index, pins, corpus);

    expect(ids(index, 'deeper')).toEqual(['veresov', 'trap', 'other']);
    expect(ids(index, 'unrelated')).toEqual(['owen']);
  });

  test('skips a pin whose video is not in the corpus', () => {
    const index = makeIndex();
    const stats = applyVideoPins(
      index,
      { "Queen's Pawn: Veresov Attack": [{ id: 'gone' }, { id: 'veresov' }] },
      corpus
    );

    expect(ids(index, 'empty')).toEqual(['veresov']);
    expect(stats.missing).toEqual(['gone']);
  });

  test('keeps the counts in the metadata in step', () => {
    const index = makeIndex();
    const stats = applyVideoPins(index, pins, corpus);

    expect(index.positions.empty.metadata.total_videos).toBe(2);
    expect(index.positions.deeper.metadata.total_videos).toBe(3);
    expect(index.metadata.totalVideos).toBe(6);
    expect(index.metadata.videoPins).toEqual({ pagesFilled: 1, added: 3 });
    expect(stats).toMatchObject({ pagesFilled: 1, added: 3 });
  });
});
