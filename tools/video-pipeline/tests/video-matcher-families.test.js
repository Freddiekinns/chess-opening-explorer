/**
 * Test Suite: Video Matcher — family recall and video level
 *
 * Three gaps measured on the 2026-11 index:
 *
 * 1. Recall. The family path only knew the families whose page names happen
 *    to match a hand list verbatim, so "QGD: …" (5% of 532 pages covered),
 *    "QGA: …" (0%), "Gruenfeld: …" and every generic variation of a
 *    punctuated family ("Caro-Kann Defense: Advance Variation") scored 0
 *    against titles that name them outright.
 * 2. Level. Nothing recorded whether a video is an overview of a family or a
 *    lecture on one of its variations, so the Sicilian Defense root page led
 *    with ten sub-variation videos and no overview.
 * 3. Promotion. Intro videos from standard-tier channels lost to any
 *    premium-channel title carrying the right keyword.
 */

const VideoMatcher = require('../lib/video-matcher');

jest.mock('../database/schema-manager.js', () => {
  return jest.fn().mockImplementation(() => ({
    db: {
      all: jest.fn(),
      run: jest.fn(),
      get: jest.fn(),
    },
  }));
});

describe('VideoMatcher — family recall and video level', () => {
  let matcher;

  beforeEach(() => {
    matcher = new VideoMatcher(':memory:');
  });

  const createVideo = (overrides = {}) => ({
    title: 'Test Video',
    description: '',
    channel_title: 'Hanging Pawns',
    duration: 1800,
    tags: [],
    ...overrides,
  });

  const opening = (name, eco, aliases = []) => ({ name, eco, aliases });

  describe('family path from the ECO code and the title', () => {
    it('matches an abbreviated page name to a title that spells the family out', () => {
      const score = matcher.calculateMatchScore(
        createVideo({
          title:
            "Queen's Gambit Declined, Exchange | Carlsbad Structure - Chess Openings Explained",
          channel_title: 'Saint Louis Chess Club',
        }),
        opening('QGD: Exchange', 'D35')
      );
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('matches a generic variation of a hyphenated family', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: 'Caro-Kann Defense - Advance Variation in Depth ⎸Chess Openings' }),
        opening('Caro-Kann Defense: Advance Variation', 'B12')
      );
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('matches a transliterated page name', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: 'Exchange Variation of the Grünfeld Defense' }),
        opening('Gruenfeld: Exchange Variation', 'D85')
      );
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('ranks a family overview below a video naming the variation', () => {
      const page = opening("King's Indian Defense: Sämisch Variation", 'E80');
      const overview = matcher.calculateMatchScore(
        createVideo({ title: "The King's Indian Defense | Chess Opening Tutorial" }),
        page
      );
      const specific = matcher.calculateMatchScore(
        createVideo({ title: "King's Indian Defense: Samisch Variation | Chess Opening Tutorial" }),
        page
      );
      expect(overview).toBeGreaterThan(0);
      expect(specific).toBeGreaterThan(overview);
    });

    it('still rejects a sibling variation of the same family', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: "Tarrasch Defense Opening Theory | Queen's Gambit Declined" }),
        opening('QGD: Exchange', 'D35')
      );
      expect(score).toBe(0);
    });

    it('still rejects a different family sharing the variation word', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: 'Caro-Kann, Exchange Variation · Complete Chess Openings' }),
        opening('QGD: Exchange', 'D35')
      );
      expect(score).toBe(0);
    });

    it('treats the family named in a title as the name of the family root page', () => {
      const score = matcher.calculateMatchScore(
        createVideo({
          title: 'Chess Openings: Caro Kann',
          channel_title: 'thechesswebsite',
          duration: 720,
        }),
        opening('Caro-Kann Defense', 'B10')
      );
      expect(score).toBeGreaterThanOrEqual(60);
    });
  });

  describe('families with no detector of their own', () => {
    const explained = (title, overrides = {}) =>
      createVideo({ title: `${title} | Chess Openings Explained`, ...overrides });

    it('matches a title that carries the name the page files its variation under', () => {
      expect(
        matcher.calculateMatchScore(
          explained("Bishop's Opening"),
          opening("Bishop's Opening: Urusov Gambit", 'C24')
        )
      ).toBeGreaterThanOrEqual(60);
    });

    it('does not take a keyword for a sibling when it is the page own opening', () => {
      expect(
        matcher.calculateMatchScore(
          explained('Nimzowitsch Defense'),
          opening('Nimzowitsch Defense: Kennedy Variation', 'B00')
        )
      ).toBeGreaterThanOrEqual(60);
    });

    it('files the Old Benoni with the Benoni', () => {
      expect(
        matcher.calculateMatchScore(
          explained('The Old Benoni'),
          opening('Old Benoni: Schmidt, 6.Be2 O-O', 'A43')
        )
      ).toBeGreaterThanOrEqual(60);
    });

    it('does not match on a name made of words other openings share', () => {
      expect(
        matcher.calculateMatchScore(
          explained('The Old Indian Defense'),
          opening('Indian Defense: Normal Variation', 'A46')
        )
      ).toBe(0);
    });

    it('leaves a title about a family it knows to that family', () => {
      expect(
        matcher.calculateMatchScore(
          explained("Sicilian Defense against the Bishop's Opening players"),
          opening("Bishop's Opening: Urusov Gambit", 'C24')
        )
      ).toBe(0);
    });

    it('scores such a page through the pre-filter of a matching run', async () => {
      matcher.db.db.all.mockImplementation((sql, cb) =>
        cb(null, [
          { id: 'urusov', name: "Bishop's Opening: Urusov Gambit", eco: 'C24', aliases: '[]' },
        ])
      );
      matcher.db.db.run.mockImplementation((sql, params, cb) => cb.call({}, null));
      jest.spyOn(console, 'log').mockImplementation(() => {});
      const result = await matcher.runMatchingWithVideos(
        [
          {
            id: 'bishops',
            title: "Bishop's Opening | Chess Openings Explained",
            description: '',
            channelTitle: 'Hanging Pawns',
            duration: 1800,
            statistics: { viewCount: '1000' },
            publishedAt: '2024-01-01T00:00:00Z',
            thumbnails: { default: { url: 'https://i.ytimg.com/vi/bishops/default.jpg' } },
            tags: [],
          },
        ],
        { clearDb: false }
      );
      console.log.mockRestore();
      expect(result.matches.map((m) => m.opening_id)).toEqual(['urusov']);
    });
  });

  describe('page names that spell an umlaut out', () => {
    it('reads "Sämisch" in a title as the Saemisch of the page name', () => {
      const page = opening("King's Indian: Saemisch, 5...O-O", 'E81');
      const specific = matcher.calculateMatchScore(
        createVideo({ title: "King's Indian Defense: Sämisch Variation | Chess Openings" }),
        page
      );
      const generic = matcher.calculateMatchScore(
        createVideo({ title: "King's Indian Defense | Chess Openings" }),
        page
      );
      expect(specific).toBeGreaterThan(generic);
    });
  });

  describe('an alias that is only the family name', () => {
    const page = opening("King's Indian: Sämisch, 5...O-O", 'E81', ["King's Indian Defense"]);

    it('does not seat a sibling-variation video as a name match', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: "Mar del Plata | King's Indian Defense Theory" }),
        page
      );
      expect(score).toBe(0);
    });

    it('still lets a family overview through as a family match', () => {
      const score = matcher.calculateMatchScore(
        createVideo({ title: "Mastering the King's Indian Defense | Theory" }),
        page
      );
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('intro videos', () => {
    it('counts "learn" as an educational title', () => {
      const page = opening('Caro-Kann Defense', 'B10');
      const base = { channel_title: 'GothamChess', duration: 566 };
      const learn = matcher.calculateMatchScore(
        createVideo({ ...base, title: 'Learn the Caro-Kann Defense | Chess Openings' }),
        page
      );
      const plain = matcher.calculateMatchScore(
        createVideo({ ...base, title: 'The Caro-Kann Defense | Chess Openings' }),
        page
      );
      expect(learn - plain).toBeGreaterThanOrEqual(30);
    });

    it('counts "10-Minute Chess Openings" as an educational title', () => {
      const page = opening('Sicilian Defense', 'B20');
      const base = { channel_title: 'GothamChess', duration: 576 };
      const series = matcher.calculateMatchScore(
        createVideo({ ...base, title: 'The Sicilian Defense | 10-Minute Chess Openings' }),
        page
      );
      const plain = matcher.calculateMatchScore(
        createVideo({ ...base, title: 'The Sicilian Defense | Chess Openings' }),
        page
      );
      expect(series - plain).toBeGreaterThanOrEqual(30);
    });

    it('gives a proven audience a bounded bonus', () => {
      const page = opening('Caro-Kann Defense', 'B10');
      const title = 'The Caro-Kann Defense explained';
      const popular = matcher.calculateMatchScore(
        createVideo({ title, view_count: 5000000 }),
        page
      );
      const obscure = matcher.calculateMatchScore(createVideo({ title, view_count: 5000 }), page);
      expect(popular).toBeGreaterThan(obscure);
      expect(popular - obscure).toBeLessThanOrEqual(20);
    });

    it('never lets views outrank a video that names the variation', () => {
      const page = opening('Sicilian Defense: Najdorf Variation', 'B90');
      const generic = matcher.calculateMatchScore(
        createVideo({ title: 'Sicilian Defense explained', view_count: 10000000 }),
        page
      );
      const specific = matcher.calculateMatchScore(
        createVideo({ title: 'Sicilian Defense: Najdorf Variation explained', view_count: 1000 }),
        page
      );
      expect(specific).toBeGreaterThan(generic);
    });

    it('does not let views lift a match over the threshold', () => {
      const page = opening('Sicilian Defense', 'B20');
      const video = { title: 'sicilian defense', channel_title: 'Unknown Channel', duration: 400 };
      const quiet = matcher.calculateMatchScore(createVideo(video), page);
      const viral = matcher.calculateMatchScore(
        createVideo({ ...video, view_count: 9000000 }),
        page
      );
      expect(quiet).toBeLessThan(matcher.config.min_match_score);
      expect(viral).toBe(quiet);
    });
  });

  describe('video level across a matching run', () => {
    const candidate = (id, title, views, overrides = {}) => ({
      id,
      title,
      description: '',
      channelTitle: 'Hanging Pawns',
      duration: 1800,
      statistics: { viewCount: String(views) },
      publishedAt: '2024-01-01T00:00:00Z',
      thumbnails: { default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` } },
      tags: [],
      ...overrides,
    });

    const run = async (openings, videos) => {
      matcher.db.db.all.mockImplementation((sql, cb) =>
        cb(
          null,
          openings.map((o) => ({ aliases: '[]', ...o }))
        )
      );
      matcher.db.db.run.mockImplementation((sql, params, cb) => cb.call({}, null));
      jest.spyOn(console, 'log').mockImplementation(() => {});
      const result = await matcher.runMatchingWithVideos(videos, { clearDb: false });
      console.log.mockRestore();
      return result;
    };

    const scoreOn = (result, openingId, videoId) =>
      (result.matches.find((m) => m.opening_id === openingId && m.video_id === videoId) || {})
        .match_score;

    const sicilian = [
      { id: 'root', name: 'Sicilian Defense', eco: 'B20' },
      { id: 'najdorf', name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' },
    ];
    const lectures = [
      candidate('specific', 'The Najdorf (part 1) | Sicilian Defense Theory', 300000),
      candidate('overview', 'Ideas and plans | Sicilian Defense Theory', 100000),
    ];

    it('ranks an overview above a variation lecture on the family root page', async () => {
      const result = await run(sicilian, lectures);
      expect(scoreOn(result, 'root', 'overview')).toBeGreaterThan(
        scoreOn(result, 'root', 'specific')
      );
    });

    it('keeps the variation lecture first on its own page', async () => {
      const result = await run(sicilian, lectures);
      expect(scoreOn(result, 'najdorf', 'specific')).toBeGreaterThan(
        scoreOn(result, 'najdorf', 'overview') || 0
      );
    });

    it('records each video as an overview or a variation video', async () => {
      const result = await run(sicilian, lectures);
      const level = (videoId) => result.matches.find((m) => m.video_id === videoId).video.level;
      expect(level('specific')).toBe('variation');
      expect(level('overview')).toBe('overview');
    });

    it('does not demote a video on the page of the variation it names', async () => {
      const openings = [
        { id: 'italian', name: 'Italian Game', eco: 'C50' },
        { id: 'evans', name: 'Evans Gambit', eco: 'C51' },
      ];
      const evans = candidate('evans-video', 'The Evans Gambit | Italian Game Theory', 200000);
      const result = await run(openings, [evans]);
      const raw = matcher.calculateMatchScore(
        { ...evans, channel_title: evans.channelTitle, view_count: 200000 },
        { name: 'Evans Gambit', eco: 'C51', aliases: [] }
      );
      expect(scoreOn(result, 'evans', 'evans-video')).toBe(raw);
      expect(scoreOn(result, 'italian', 'evans-video')).toBeLessThan(raw);
    });

    const caroKann = [
      { id: 'advance', name: 'Caro-Kann Defense: Advance Variation', eco: 'B12' },
      { id: 'short', name: 'Caro-Kann Defense: Advance Variation, Short Variation', eco: 'B12' },
      { id: 'exchange', name: 'Caro-Kann Defense: Exchange Variation', eco: 'B13' },
    ];

    it('keeps a lecture on one variation off its sibling variations', async () => {
      const result = await run(caroKann, [
        candidate('advance-video', 'Caro-Kann Defense: Advance Variation | Chess Openings', 0),
      ]);
      expect(scoreOn(result, 'advance', 'advance-video')).toBeGreaterThanOrEqual(60);
      expect(scoreOn(result, 'exchange', 'advance-video')).toBeUndefined();
    });

    it('keeps a lecture on a sub-line on the page of the line it belongs to', async () => {
      const result = await run(caroKann, [
        candidate('short-video', 'Caro-Kann Advance Variation: Short Variation theory', 0),
      ]);
      expect(scoreOn(result, 'short', 'short-video')).toBeGreaterThanOrEqual(60);
      expect(scoreOn(result, 'advance', 'short-video')).toBeGreaterThanOrEqual(60);
      expect(scoreOn(result, 'exchange', 'short-video')).toBeUndefined();
    });

    it('keeps a family overview on every variation page', async () => {
      const result = await run(
        [...caroKann, { id: 'gruenfeld', name: 'Gruenfeld: Exchange Variation', eco: 'D85' }],
        [
          candidate('caro-overview', 'Ideas and plans | Caro-Kann Defense Theory', 0),
          candidate('gruenfeld-overview', 'The Grünfeld Defense | Chess Openings Explained', 0),
        ]
      );
      expect(scoreOn(result, 'exchange', 'caro-overview')).toBeGreaterThanOrEqual(60);
      expect(scoreOn(result, 'gruenfeld', 'gruenfeld-overview')).toBeGreaterThanOrEqual(60);
    });

    it('does not let views keep a demoted video on a root page', async () => {
      const openings = [{ id: 'italian', name: 'Italian Game', eco: 'C50' }];
      const evans = (views) =>
        candidate('evans-video', 'The Evans Gambit | Italian Game', views, {
          channelTitle: 'GothamChess',
        });
      const quiet = await run(openings, [evans(0)]);
      const viral = await run(openings, [evans(5000000)]);
      expect(scoreOn(quiet, 'italian', 'evans-video')).toBeUndefined();
      expect(scoreOn(viral, 'italian', 'evans-video')).toBeUndefined();
    });

    it('does not call an overview a variation video because another opening has a line named after its family', async () => {
      const result = await run(
        [
          { id: 'root', name: 'Sicilian Defense', eco: 'B20' },
          { id: 'pterodactyl', name: 'Pterodactyl Defense: Sicilian, Unpin', eco: 'B27' },
        ],
        [candidate('intro', 'Sicilian Defense (introduction, ideas & variations)', 700000)]
      );
      expect(result.matches.find((m) => m.video_id === 'intro').video.level).toBe('overview');
    });

    const gothamIntro = candidate(
      'gotham',
      'The Sicilian Defense | 10-Minute Chess Openings',
      3400000,
      { channelTitle: 'GothamChess', duration: 576 }
    );
    const speedrun = candidate(
      'speedrun',
      'Master Class | Sicilian Defense | Chess Speedrun | Grandmaster Naroditsky',
      220000,
      { channelTitle: 'Daniel Naroditsky', duration: 2400 }
    );
    const rawScore = (video, page) =>
      matcher.calculateMatchScore(
        {
          ...video,
          channel_title: video.channelTitle,
          view_count: Number(video.statistics.viewCount),
        },
        { aliases: [], ...page }
      );

    it('leads a family root page with an introduction to the opening', async () => {
      const result = await run(sicilian, [gothamIntro, speedrun]);
      expect(scoreOn(result, 'root', 'gotham')).toBeGreaterThan(
        scoreOn(result, 'root', 'speedrun')
      );
    });

    it('gives the introduction nothing extra on a variation page or in a speedrun', async () => {
      const intro = candidate('hp-intro', 'Introduction to the Sicilian Defense', 100000);
      const beginnerRun = candidate(
        'beginner-run',
        'Beginner To Master | Chess Speedrun | Sicilian Defense',
        70000,
        { channelTitle: 'Daniel Naroditsky' }
      );
      const result = await run(sicilian, [intro, beginnerRun]);
      expect(scoreOn(result, 'najdorf', 'hp-intro')).toBe(rawScore(intro, sicilian[1]));
      expect(scoreOn(result, 'root', 'beginner-run')).toBe(rawScore(beginnerRun, sicilian[0]));
      expect(scoreOn(result, 'root', 'hp-intro')).toBeGreaterThan(rawScore(intro, sicilian[0]));
    });

    it('only lifts an introduction to the opening the page is about', async () => {
      const kidIntro = candidate(
        'kid-intro',
        "Learn the King's Indian Setup | 10-Minute Chess Openings",
        3100000,
        { channelTitle: 'GothamChess', duration: 503 }
      );
      const pannoIntro = candidate('panno-intro', 'Introduction to the Panno System', 20000);
      const pages = [
        { id: 'panno', name: 'Panno System', eco: 'E63' },
        { id: 'szen', name: 'Sicilian, Taimanov, Szen', eco: 'B44' },
        { id: 'defence', name: 'Sicilian Defence', eco: 'B20' },
      ];
      const result = await run(pages, [kidIntro, pannoIntro, gothamIntro]);
      expect(scoreOn(result, 'panno', 'kid-intro')).toBe(rawScore(kidIntro, pages[0]));
      expect(scoreOn(result, 'szen', 'gotham')).toBe(rawScore(gothamIntro, pages[1]));
      expect(scoreOn(result, 'panno', 'panno-intro')).toBeGreaterThan(
        rawScore(pannoIntro, pages[0])
      );
      expect(scoreOn(result, 'defence', 'gotham')).toBeGreaterThan(rawScore(gothamIntro, pages[2]));
    });

    it('does not lift a beginner video that only mentions the opening in its description', async () => {
      const roundUp = candidate('round-up', 'Popular Beginner Openings', 300000, {
        description: 'We look at the Italian Game, then the Italian Game once more.',
        channelTitle: 'Saint Louis Chess Club',
      });
      const page = { id: 'italian', name: 'Italian Game', eco: 'C50' };
      const result = await run([page], [roundUp]);
      expect(scoreOn(result, 'italian', 'round-up')).toBe(rawScore(roundUp, page));
    });

    it('does not lift a played game whose title promises to teach the opening', async () => {
      const training = candidate(
        'training',
        "If you wanna learn the Queen's Gambit for black, analyze this game. · Training Game",
        6000
      );
      const ladder = candidate(
        'ladder',
        "Crash Course in the Queen's Gambit Declined | Climbing the Rating Ladder vs. 1827",
        90000,
        { channelTitle: 'John Bartholomew' }
      );
      const pages = [
        { id: 'qg', name: "Queen's Gambit", eco: 'D06' },
        { id: 'qgd', name: "Queen's Gambit Declined", eco: 'D30' },
      ];
      const result = await run(pages, [training, ladder]);
      expect(scoreOn(result, 'qg', 'training')).toBe(rawScore(training, pages[0]));
      expect(scoreOn(result, 'qgd', 'ladder')).toBe(rawScore(ladder, pages[1]));
    });

    it('does not demote a video on a root page that carries the line as an alias', async () => {
      const video = candidate('giuoco', 'Giuoco Piano | Italian Game Theory', 0);
      const result = await run(
        [{ id: 'italian', name: 'Italian Game', eco: 'C50', aliases: '["Giuoco Piano"]' }],
        [video]
      );
      expect(scoreOn(result, 'italian', 'giuoco')).toBe(
        rawScore(video, { name: 'Italian Game', eco: 'C50', aliases: ['Giuoco Piano'] })
      );
    });

    describe('the Jobava London', () => {
      // The ECO name is "Rapport-Jobava System"; titles call it the Jobava
      // London, so it matched only the London pages and none of its own
      const pages = [
        { id: 'jobava', name: 'Rapport-Jobava System', eco: 'D01' },
        { id: 'jobava-e6', name: 'Rapport-Jobava System, with e6', eco: 'D01' },
        {
          id: 'london-d02',
          name: "Queen's Pawn Game: London System",
          eco: 'D02',
          aliases: '["London System"]',
        },
        { id: 'london-a48', name: 'London System', eco: 'A48' },
      ];
      const jobava = candidate('jobava', 'Introduction to the Jobava London System', 50000);
      const london = candidate('london', 'London System for Beginners', 50000);

      it('matches a Jobava London video to the Rapport-Jobava pages', async () => {
        const result = await run(pages, [jobava]);
        expect(scoreOn(result, 'jobava', 'jobava')).toBeGreaterThanOrEqual(
          matcher.config.min_match_score
        );
        expect(scoreOn(result, 'jobava-e6', 'jobava')).toBeGreaterThanOrEqual(
          matcher.config.min_match_score
        );
      });

      it('ignores a Jobava London cross-link in a description', async () => {
        // Every Naroditsky video description links his Jobava London lecture
        const puzzles = candidate('puzzles', 'Mastering Chess Tactics | Advanced Puzzles', 50000, {
          description: "Bortnyk and Naroditsky's Jobava London\nhttps://youtu.be/example",
        });
        const result = await run(pages, [puzzles]);
        expect(scoreOn(result, 'jobava', 'puzzles')).toBeUndefined();
      });

      it('ignores the openings a played-game video lists in its chapters or tags', async () => {
        // Each names an opening that came up in one game, not the subject
        const arena = candidate(
          'arena',
          'How to Beat Amateurs at Chess | Daily Rapid Arena',
          50000,
          {
            description: '1:40:27 Borg Defense - vs a\n1:49:41 Rapport-Jobava System - vs b',
            channelTitle: 'Eric Rosen',
          }
        );
        const speedrun = candidate('speedrun', 'Opening Tactics! | Speedrun Episode 36', 50000, {
          description: '19:00 Fighting the London',
          tags: ['speedrun', 'greek gift', 'london', 'london system'],
          channelTitle: 'Eric Rosen',
        });
        const result = await run(pages, [arena, speedrun]);
        expect(scoreOn(result, 'jobava', 'arena')).toBeUndefined();
        expect(scoreOn(result, 'london-a48', 'speedrun')).toBeUndefined();
      });

      it('still matches a speedrun whose title names the opening loosely', async () => {
        // Naroditsky's titles list the episode's openings: "Bird", not "Bird Opening"
        const bird = { id: 'bird', name: 'Bird Opening', eco: 'A02' };
        const episode = candidate(
          'episode',
          "How GMs TRAP London System Players!! | Glek, Kings Indian, Bird | GM Naroditsky's DYI Speedrun",
          200000,
          {
            description: 'Learn a rare but powerful response to the Bird Opening with Nh6.',
            channelTitle: 'Daniel Naroditsky',
          }
        );
        const result = await run([bird], [episode]);
        expect(scoreOn(result, 'bird', 'episode')).toBeDefined();
      });

      it('still matches a played game whose title names the line', async () => {
        // The page name is too long to title-match; the title names its line
        const morris = {
          id: 'morris-page',
          name: "Queen's Pawn Game: Accelerated London System, Steinitz Countergambit, Morris Countergambit Accepted",
          eco: 'D00',
        };
        const game = candidate(
          'morris',
          'Be prepared for the Morris Countergambit! · Training Game',
          50000,
          {
            description:
              "Queen's Pawn Game: Accelerated London System, Steinitz Countergambit, Morris Countergambit Accepted",
            channelTitle: 'ChessNetwork',
          }
        );
        const result = await run([morris], [game]);
        expect(scoreOn(result, 'morris-page', 'morris')).toBeDefined();
      });

      it('keeps a Jobava London video off the London System pages', async () => {
        const result = await run(pages, [jobava]);
        expect(scoreOn(result, 'london-d02', 'jobava')).toBeUndefined();
        expect(scoreOn(result, 'london-a48', 'jobava')).toBeUndefined();
      });

      it('still matches a plain London video to the London System pages', async () => {
        const result = await run(pages, [london]);
        expect(scoreOn(result, 'london-d02', 'london')).toBeDefined();
        expect(scoreOn(result, 'london-a48', 'london')).toBeDefined();
        expect(scoreOn(result, 'jobava', 'london')).toBeUndefined();
      });
    });

    it('does not read half of a double-barrelled name as a variation', async () => {
      const result = await run(
        [{ id: 'larsen', name: 'Nimzo-Larsen Attack', eco: 'A01' }],
        [candidate('b3', 'Nimzowitsch-Larsen Attack | Nimzo-Larsen Attack Explained', 0)]
      );
      expect(result.matches.find((m) => m.video_id === 'b3').video.level).toBe('overview');
    });

    describe('creators on one page', () => {
      const rankOn = (result, openingId) =>
        result.matches
          .filter((m) => m.opening_id === openingId)
          .sort((a, b) => matcher.compareMatches(a, b))
          .map((m) => m.video_id);

      it('lets a third video from one creator give way to a near-equal from another', async () => {
        const result = await run(
          [{ id: 'root', name: 'Caro-Kann Defense', eco: 'B10' }],
          [
            candidate('hp-1', 'Caro-Kann Defense Theory: ideas for White', 400000),
            candidate('hp-2', 'Caro-Kann Defense Theory: ideas for Black', 300000),
            candidate('hp-3', 'Caro-Kann Defense Theory: typical endgames', 200000),
            candidate('stl', 'Caro-Kann Defense | Chess Openings Explained', 20000, {
              channelTitle: 'Saint Louis Chess Club',
            }),
          ]
        );
        expect(rankOn(result, 'root')).toEqual(['hp-1', 'hp-2', 'stl', 'hp-3']);
      });

      it('leaves a creator alone when nobody else is close', async () => {
        const result = await run(
          [{ id: 'root', name: 'Caro-Kann Defense', eco: 'B10' }],
          [
            candidate('hp-1', 'Caro-Kann Defense Theory: ideas for White', 400000),
            candidate('hp-2', 'Caro-Kann Defense Theory: ideas for Black', 300000),
            candidate('hp-3', 'Caro-Kann Defense Theory: typical endgames', 200000),
            candidate('weak', 'Caro-Kann Defense', 0, { channelTitle: 'Nobody' }),
          ]
        );
        expect(rankOn(result, 'root')).toEqual(['hp-1', 'hp-2', 'hp-3', 'weak']);
      });

      it('never lets variety lift a generic video over one that names the variation', async () => {
        const result = await run(
          [{ id: 'najdorf', name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' }],
          [
            candidate('hp-1', 'The Najdorf, part 1 | Sicilian Defense', 0),
            candidate('hp-2', 'The Najdorf, part 2 | Sicilian Defense', 0),
            candidate('hp-3', 'The Najdorf, part 3 | Sicilian Defense', 0),
            candidate('generic', 'Sicilian Defense | Chess Openings Explained', 5000000, {
              channelTitle: 'Saint Louis Chess Club',
            }),
          ]
        );
        const order = rankOn(result, 'najdorf');
        expect(order.indexOf('hp-3')).toBeLessThan(order.indexOf('generic'));
      });
    });

    it('scores a family-titled video against pages named by abbreviation', async () => {
      const result = await run(
        [{ id: 'qgd-exchange', name: 'QGD: Exchange', eco: 'D35' }],
        [
          candidate(
            'carlsbad',
            "Queen's Gambit Declined, Exchange | Carlsbad Structure - Chess Openings Explained",
            150000,
            { channelTitle: 'Saint Louis Chess Club' }
          ),
        ]
      );
      expect(scoreOn(result, 'qgd-exchange', 'carlsbad')).toBeGreaterThanOrEqual(60);
    });
  });
});
