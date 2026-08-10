/**
 * Test Suite: Channel Tiers
 * One tier resolver for the scorer and the corpus loader.
 */

const path = require('path');
const { loadChannelTiers, resolveTier } = require('../lib/channel-tiers');

describe('channel tiers', () => {
  const tiers = loadChannelTiers();

  it('matches a config name against the channel title despite spacing', () => {
    // config: "Chess Network" (premium) — YouTube: "ChessNetwork"
    expect(resolveTier(tiers, { channelTitle: 'ChessNetwork' })).toBe('premium');
  });

  it('matches a config name against a longer channel title', () => {
    expect(resolveTier(tiers, { channelTitle: "agadmator's Chess Channel" })).toBe('standard');
  });

  it('ignores a parenthesised real name in the config', () => {
    expect(resolveTier(tiers, { channelTitle: 'Remote Chess Academy' })).toBe('standard');
    expect(resolveTier(tiers, { channelTitle: 'Chessexplained' })).toBe('premium');
  });

  it('matches names that differ only by punctuation', () => {
    expect(resolveTier(tiers, { channelTitle: 'Chess.com' })).toBe('standard');
    expect(resolveTier(tiers, { channelTitle: 'thechesswebsite' })).toBe('standard');
  });

  it('prefers channel id over the title', () => {
    const byId = loadChannelTiers();
    expect(
      resolveTier(byId, { channelId: 'UCM-ONC2bCHytG2mYtKDmIeA', channelTitle: 'Some Rebrand' })
    ).toBe('premium');
  });

  it('returns null for an unknown channel', () => {
    expect(resolveTier(tiers, { channelTitle: 'Random Chess Guy' })).toBeNull();
    expect(resolveTier(tiers, {})).toBeNull();
  });

  it('returns null for every channel when the config is missing', () => {
    const empty = loadChannelTiers(path.join(__dirname, 'no-such-config.json'));
    expect(resolveTier(empty, { channelTitle: 'ChessNetwork' })).toBeNull();
  });
});
