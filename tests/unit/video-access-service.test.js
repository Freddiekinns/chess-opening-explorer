const VideoAccessService = require('../../packages/api/src/services/video-access-service');

describe('VideoAccessService Test', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should be able to import the service', () => {
    expect(typeof VideoAccessService).toBe('function');
  });
});

describe('getAllPositions (family-fallback source)', () => {
  // Object.create skips the constructor's file IO so each case can set the
  // index state directly.
  const build = (state) => Object.assign(Object.create(VideoAccessService.prototype), state);

  it('returns [] in individual-files mode', () => {
    const service = build({ useConsolidatedIndex: false, videoIndex: null });
    expect(service.getAllPositions()).toEqual([]);
  });

  it('returns [] when the consolidated index has no positions', () => {
    const service = build({ useConsolidatedIndex: true, videoIndex: {} });
    expect(service.getAllPositions()).toEqual([]);
    const noIndex = build({ useConsolidatedIndex: true, videoIndex: null });
    expect(noIndex.getAllPositions()).toEqual([]);
  });

  it('maps positions to {fen, videos} and filters malformed entries', () => {
    const service = build({
      useConsolidatedIndex: true,
      videoIndex: {
        positions: {
          a: { opening: { id: 'fen-a' }, videos: [{ id: 'v1' }] },
          b: { opening: { id: 'fen-b' } }, // no videos array -> []
          c: { opening: {} }, // no opening id -> dropped
          d: null, // malformed -> dropped
        },
      },
    });

    expect(service.getAllPositions()).toEqual([
      { fen: 'fen-a', videos: [{ id: 'v1' }] },
      { fen: 'fen-b', videos: [] },
    ]);
  });
});
