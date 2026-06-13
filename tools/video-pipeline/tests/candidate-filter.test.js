/**
 * Test Suite: Pre-Filter Video Candidates
 * Word-boundary regressions: the old substring patterns rejected
 * "Fundamentals" (fun), "delivers" (live) and "background" (round).
 */

const PreFilterVideos = require('../lib/candidate-filter');

describe('PreFilterVideos', () => {
  let filter;

  beforeEach(() => {
    filter = new PreFilterVideos();
  });

  const video = (title, overrides = {}) => ({ title, ...overrides });

  describe('word-boundary exclusions', () => {
    it('should keep "Chess Opening Fundamentals"', () => {
      expect(filter.preFilterVideo(video('Chess Opening Fundamentals'))).toBe(true);
    });

    it('should keep titles containing "delivers"', () => {
      expect(filter.preFilterVideo(video('GM delivers a Sicilian Defense masterclass'))).toBe(true);
    });

    it('should keep titles containing "background" and "grounded"', () => {
      expect(filter.preFilterVideo(video('Background of the Najdorf Variation'))).toBe(true);
      expect(filter.preFilterVideo(video('A grounded repertoire against the Sicilian'))).toBe(true);
    });

    it('should still reject genuine live/tournament/round content', () => {
      expect(filter.preFilterVideo(video('LIVE: Candidates Tournament Opening Analysis'))).toBe(
        false
      );
      expect(filter.preFilterVideo(video('Round 7 recap — World Championship match'))).toBe(false);
    });

    it('should still reject reaction and podcast content', () => {
      expect(filter.preFilterVideo(video('Reacting to the worst opening blunders'))).toBe(false);
      expect(filter.preFilterVideo(video('Chess podcast: opening trends in 2026'))).toBe(false);
    });
  });

  describe('casual exemption for educational titles', () => {
    it('should keep "Blitz Opening Repertoire" teaching content', () => {
      expect(filter.preFilterVideo(video('My Complete Blitz Opening Repertoire'))).toBe(true);
    });

    it('should keep educational speedruns mentioning a time control', () => {
      expect(filter.preFilterVideo(video('Sicilian Defense Theory Speedrun (Blitz Arena)'))).toBe(
        true
      );
    });

    it('should still reject casual blitz content without teaching markers', () => {
      expect(filter.preFilterVideo(video('Late night blitz with the Sicilian Defense'))).toBe(
        false
      );
    });
  });

  describe('educational content requirement', () => {
    it('should reject titles with no educational chess markers', () => {
      expect(filter.preFilterVideo(video('My day at the chess club'))).toBe(false);
    });

    it('should keep opening-focused educational titles', () => {
      expect(filter.preFilterVideo(video("Queen's Gambit Declined explained"))).toBe(true);
    });
  });
});
