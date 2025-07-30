describe('VideoAccessService Test', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should be able to import the service', () => {
    const VideoAccessService = require('../../packages/api/src/services/video-access-service');
    expect(typeof VideoAccessService).toBe('function');
  });
});
