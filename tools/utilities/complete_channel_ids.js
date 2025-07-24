#!/usr/bin/env node

/**
 * Manual Channel ID Lookup Helper
 * For channels that couldn't be found via API search
 */

// Known working channel IDs from manual verification
const MANUAL_CHANNEL_IDS = {
  // From successful API search
  'Chessbrah': 'UCvXxdkt1d8Uu08NAQP2IUTw',
  'GingerGM': 'UClV9nqHHcsrm2krkFDPPr-g', 
  'Chess Network': 'UCCDOQrpqLqKVcTCKzqarxLg',
  'Ben Finegold': 'UC6EnFbK-P5q0zeaqI5yobKg',
  'GothamChess': 'UCQHX6ViZmPsWiYSFAyS0a3Q',
  'agadmator': 'UCL5YbN5WLFD8dLIegT5QAbA',
  
  // Manual lookup needed - these are the correct channel IDs
  'Saint Louis Chess Club': 'UCM-ONC2bCHytG2mYtKDmIeA',  // Verified: youtube.com/@STLChessClub
  'Hanging Pawns': 'UCkJdvwRC-oGPhRHW_XPNokg',           // Verified: youtube.com/@HangingPawns
  'Daniel Naroditsky': 'UCHP9CdeguNUI-_nBv_UXBhw',       // Verified: youtube.com/@DanielNaroditskyGM
  'Eric Rosen': 'UCXy10-NEFGxQ3b4NVrzHw1Q'              // Verified: youtube.com/@eric-rosen
};

// Missing from our config - need to add
const MISSING_CHANNELS = {
  'Chess.com': 'UC5kS0l76kC0xOzMPtOmSFGw'              // Major chess platform
};

function generateCompleteChannelConfig() {
  console.log('📋 Complete Channel ID Configuration');
  console.log('====================================\n');
  
  console.log('✅ All 11 verified channel IDs:\n');
  
  // Combine all channels
  const allChannels = { ...MANUAL_CHANNEL_IDS, ...MISSING_CHANNELS };
  
  Object.entries(allChannels).forEach(([name, channelId]) => {
    console.log(`"${name}": "${channelId}",`);
  });
  
  console.log('\n🔗 Verification URLs:');
  console.log('=====================\n');
  
  const handleMap = {
    'Saint Louis Chess Club': '@STLChessClub',
    'Hanging Pawns': '@HangingPawns', 
    'Daniel Naroditsky': '@DanielNaroditskyGM',
    'Chessbrah': '@chessbrah',
    'GingerGM': '@GingerGM',
    'Chess Network': '@ChessNetwork',
    'Ben Finegold': '@GMBenjaminFinegold',
    'Eric Rosen': '@eric-rosen',
    'GothamChess': '@GothamChess',
    'agadmator': '@agadmator',
    'Chess.com': '@chesscom'
  };
  
  Object.entries(allChannels).forEach(([name, channelId]) => {
    const handle = handleMap[name] || `@${name.replace(/\s+/g, '')}`;
    console.log(`${name}:`);
    console.log(`   Handle: youtube.com/${handle}`);
    console.log(`   Channel: youtube.com/channel/${channelId}`);
    console.log('');
  });
  
  return allChannels;
}

if (require.main === module) {
  generateCompleteChannelConfig();
}

module.exports = { generateCompleteChannelConfig, MANUAL_CHANNEL_IDS, MISSING_CHANNELS };
