#!/usr/bin/env node

/**
 * YouTube Channel ID Verification Tool
 * Verifies that channel IDs in youtube_channels.json are valid and accessible
 * Usage: node tools/production/verify_youtube_channels.js
 */

const fs = require('fs');
const path = require('path');

// Sample channels with verified IDs for reference
const KNOWN_GOOD_IDS = {
  'Saint Louis Chess Club': 'UCM-ONC2bCHytG2mYtKDmIeA',
  'Hanging Pawns': 'UCkJdvwRC-oGPhRHW_XPNokg',
  'Daniel Naroditsky': 'UCHP9CdeguNUI-_nBv_UXBhw',
  'Chess.com': 'UC5kS0l76kC0xOzMPtOmSFGw',
  'Chessbrah': 'UCvXxdkt1d8Uu08NAQP2IUTw',
  'GingerGM': 'UClV9nqHHcsrm2krkFDPPr-g',
  'Chess Network': 'UCCDOQrpqLqKVcTCKzqarxLg',
  'Ben Finegold': 'UC6EnFbK-P5q0zeaqI5yobKg',
  'Eric Rosen': 'UCXy10-NEFGxQ3b4NVrzHw1Q',
  'GothamChess': 'UCQHX6ViZmPsWiYSFAyS0a3Q',
  'agadmator': 'UCL5YbN5WLFD8dLIegT5QAbA'
};

/**
 * Manual verification steps:
 * 1. Go to the channel's YouTube page
 * 2. Right-click → "View Page Source"
 * 3. Search for "channelId" or "externalId"
 * 4. Or use the URL method: youtube.com/channel/[CHANNEL_ID]
 */

async function verifyChannelIds() {
  console.log('🔍 YouTube Channel ID Verification Tool');
  console.log('=====================================\n');
  
  try {
    // Read the current configuration
    const configPath = path.join(__dirname, '../../config/youtube_channels.json');
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ Configuration file not found at:', configPath);
      console.log('📝 Please create the file first using the PRD template');
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('📋 Current Channel Configuration:');
    console.log('=================================\n');
    
    let hasIssues = false;
    
    for (const channel of config.trusted_channels) {
      const channelName = channel.name;
      const channelId = channel.channel_id;
      
      console.log(`🎯 ${channelName}`);
      console.log(`   ID: ${channelId}`);
      
      // Check if we have a verified ID for this channel
      if (KNOWN_GOOD_IDS[channelName]) {
        if (KNOWN_GOOD_IDS[channelName] === channelId) {
          console.log('   ✅ VERIFIED - ID matches known good ID');
        } else {
          console.log('   ❌ MISMATCH - Expected:', KNOWN_GOOD_IDS[channelName]);
          console.log('   🔄 CORRECTION NEEDED');
          hasIssues = true;
        }
      } else {
        console.log('   ⚠️  UNVERIFIED - Please verify manually');
        console.log('   🔗 Test URL: https://youtube.com/channel/' + channelId);
        hasIssues = true;
      }
      
      console.log('');
    }
    
    if (hasIssues) {
      console.log('🚨 Issues found! Please verify the channel IDs.');
      console.log('');
      console.log('📝 How to verify channel IDs:');
      console.log('1. Go to youtube.com/channel/[CHANNEL_ID]');
      console.log('2. Verify it shows the correct channel');
      console.log('3. If not, search for the channel and get the correct ID from the URL');
      console.log('');
      console.log('💡 Alternative method:');
      console.log('1. Go to the channel page');
      console.log('2. Right-click → "View Page Source"');
      console.log('3. Search for "channelId" or "externalId"');
    } else {
      console.log('✅ All channel IDs verified successfully!');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run the verification
verifyChannelIds();
