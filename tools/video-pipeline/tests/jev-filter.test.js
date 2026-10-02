/**
 * Test Suite: Jev rejection filter
 * Jev's "not about it" was right 99% of the time in the 2026-10-02 experiment
 * (docs/proposals/2026-10-02-jev-video-experiment.md); its acceptances were
 * not. These tests pin down that the filter only ever removes on a rejection,
 * and that every failure keeps today's video rather than emptying a page.
 */

const {
  baseName,
  questionLabels,
  labelHash,
  filterVideoIndex,
  FatalJevError,
} = require('../lib/jev-filter');

const FEN_KAN = 'kan-fen';
const FEN_KAN_DEEP = 'kan-deep-fen';

const eco = {
  [FEN_KAN]: { moves: '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6' },
  [FEN_KAN_DEEP]: { moves: '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6 5. Bd3' },
};

const corpus = {
  good: { id: 'good', title: 'Sicilian Kan', channelTitle: 'Hanging Pawns', duration: 'PT20M' },
  okelly: {
    id: 'okelly',
    title: "O'Kelly Variation (2...a6)",
    channelTitle: 'Hanging Pawns',
    duration: 'PT18M',
  },
  mention: { id: 'mention', title: 'Sicilian lesson', channelTitle: 'Chess', duration: 'PT9M' },
};

function makeIndex() {
  return {
    positions: {
      [FEN_KAN]: {
        opening: { id: FEN_KAN, name: 'Sicilian Defense: Kan Variation' },
        videos: [{ id: 'good' }, { id: 'okelly' }, { id: 'mention' }],
      },
      [FEN_KAN_DEEP]: {
        opening: { id: FEN_KAN_DEEP, name: 'Sicilian Defense: Kan Variation, 5.Bd3' },
        videos: [{ id: 'okelly' }],
      },
    },
    metadata: { totalVideos: 4 },
  };
}

const LABEL = 'Sicilian Defense: Kan Variation (1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6)';

function cacheWith(answers) {
  const entries = {};
  for (const [videoId, choice] of Object.entries(answers)) {
    entries[`${videoId}|Sicilian Defense: Kan Variation`] = {
      c: choice,
      p: 0.1,
      l: labelHash(LABEL),
    };
  }
  return { model: 'jev-1.13.0', entries };
}

const ids = (index, fen) => index.positions[fen].videos.map((v) => v.id);

describe('baseName', () => {
  test('strips a trailing move list', () => {
    expect(baseName('Vienna: Frankenstein-Dracula, 11.d3')).toBe('Vienna: Frankenstein-Dracula');
  });

  test('keeps moves that are the variation name', () => {
    expect(baseName('Nimzo-Indian: 4.Bd2')).toBe('Nimzo-Indian: 4.Bd2');
    expect(baseName('Scotch: 4.Nxd4 Qf6')).toBe('Scotch: 4.Nxd4 Qf6');
  });

  test('keeps a named part that follows a move part', () => {
    expect(baseName('French: Tarrasch, 4.exd5 Qxd5, Main Line')).toBe(
      'French: Tarrasch, 4.exd5 Qxd5, Main Line'
    );
  });
});

describe('questionLabels', () => {
  test('labels a named opening with its shortest move order', () => {
    const labels = questionLabels(makeIndex(), eco);
    expect(labels.get('Sicilian Defense: Kan Variation')).toBe(LABEL);
  });
});

describe('filterVideoIndex with cached answers', () => {
  test('removes a video Jev rejects and keeps one it accepts', async () => {
    const index = makeIndex();
    const cache = cacheWith({
      good: 'main_subject',
      okelly: 'not_about',
      mention: 'mentioned_only',
    });
    const { stats } = await filterVideoIndex(index, { eco, corpus, cache });

    expect(ids(index, FEN_KAN)).toEqual(['good']);
    expect(stats.removed).toBe(3); // okelly twice (both Kan pages), mention once
  });

  test('keeps a rejection Jev is unsure of', async () => {
    // A parent-variation lecture on its own deep sub-line scores ~0.47: the
    // experiment's judged sample lost good matches only at P(good) >= 0.4.
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject', okelly: 'not_about', mention: 'not_about' });
    cache.entries['mention|Sicilian Defense: Kan Variation'].p = 0.45;
    await filterVideoIndex(index, { eco, corpus, cache });

    expect(ids(index, FEN_KAN)).toEqual(['good', 'mention']);
  });

  test('applies one answer to every position sharing the named opening', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'covered', okelly: 'not_about', mention: 'covered' });
    await filterVideoIndex(index, { eco, corpus, cache });

    expect(ids(index, FEN_KAN_DEEP)).toEqual([]);
  });

  test('re-asks when the question wording has changed since the answer', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject', okelly: 'not_about', mention: 'covered' });
    cache.entries['okelly|Sicilian Defense: Kan Variation'].l = labelHash('an older label');
    const { stats } = await filterVideoIndex(index, { eco, corpus, cache });

    // No ask function: the stale answer is not trusted, so the video stays
    expect(ids(index, FEN_KAN)).toContain('okelly');
    expect(stats.unanswered).toBe(2);
  });

  test('updates totalVideos in the metadata', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject', okelly: 'not_about', mention: 'covered' });
    await filterVideoIndex(index, { eco, corpus, cache });

    expect(index.metadata.totalVideos).toBe(2);
    expect(index.metadata.jevFilter).toMatchObject({ removed: 2 });
  });
});

describe('filterVideoIndex asking Jev', () => {
  const answer = (choice) => ({
    choice,
    probabilities: { main_subject: 0.1, covered: 0.1, mentioned_only: 0.1, not_about: 0.7 },
  });

  test('asks only for unanswered pairs and caches the answers', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject' });
    const asked = [];
    const ask = jest.fn(async (state, questions) => {
      asked.push(state.title);
      const answers = {};
      for (const qid of Object.keys(questions)) answers[qid] = answer('not_about');
      return { answers, usage: { input_tokens: 100 } };
    });

    const { stats } = await filterVideoIndex(index, { eco, corpus, cache, ask });

    expect(asked.sort()).toEqual(["O'Kelly Variation (2...a6)", 'Sicilian lesson']);
    expect(ids(index, FEN_KAN)).toEqual(['good']);
    expect(cache.entries['mention|Sicilian Defense: Kan Variation']).toMatchObject({
      c: 'not_about',
      l: labelHash(LABEL),
    });
    expect(stats.inputTokens).toBe(200);
  });

  test('keeps the video when Jev leaves its question unanswered', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject', mention: 'covered' });
    const ask = async () => ({ answers: {}, usage: { input_tokens: 100 } });

    const { stats } = await filterVideoIndex(index, { eco, corpus, cache, ask });

    expect(ids(index, FEN_KAN)).toContain('okelly');
    expect(cache.entries['okelly|Sicilian Defense: Kan Variation']).toBeUndefined();
    expect(stats.unanswered).toBe(2);
  });

  test('keeps the video when its text is not in the corpus', async () => {
    const index = makeIndex();
    index.positions[FEN_KAN].videos.push({ id: 'unknown' });
    const cache = cacheWith({ good: 'main_subject', okelly: 'covered', mention: 'covered' });
    const ask = jest.fn();

    await filterVideoIndex(index, { eco, corpus, cache, ask });

    expect(ask).not.toHaveBeenCalled();
    expect(ids(index, FEN_KAN)).toContain('unknown');
  });

  test('stops asking after an auth or billing failure and keeps the rest', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject' });
    const ask = jest.fn(async () => {
      throw new FatalJevError('Jev 401');
    });

    const { stats } = await filterVideoIndex(index, { eco, corpus, cache, ask, concurrency: 1 });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ids(index, FEN_KAN)).toEqual(['good', 'okelly', 'mention']);
    expect(stats.stoppedEarly).toMatch(/401/);
  });

  test('keeps going past an ordinary failed call', async () => {
    const index = makeIndex();
    const cache = cacheWith({ good: 'main_subject' });
    let calls = 0;
    const ask = async (state, questions) => {
      calls++;
      if (state.title.startsWith("O'Kelly")) throw new Error('Jev 529');
      const answers = {};
      for (const qid of Object.keys(questions)) answers[qid] = answer('not_about');
      return { answers, usage: { input_tokens: 100 } };
    };

    await filterVideoIndex(index, { eco, corpus, cache, ask });

    expect(calls).toBe(2);
    expect(ids(index, FEN_KAN)).toEqual(['good', 'okelly']);
  });
});
