#!/usr/bin/env node

// Simulate Vercel environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

console.log('🧪 Simple Vercel Environment Test');
console.log('==========================================');

console.log('Environment:', { VERCEL: process.env.VERCEL, NODE_ENV: process.env.NODE_ENV });

try {
  console.log('Loading ECOService...');
  const ECOService = require('../../packages/api/src/services/eco-service');
  
  console.log('Creating instance...');
  const ecoService = new ECOService();
  
  console.log('Calling getAllOpenings...');
  const openings = ecoService.getAllOpenings();
  
  console.log('✅ Success! Loaded', openings.length, 'openings');
  
  if (openings.length > 0) {
    console.log('Sample:', openings[0].name);
  }
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('==========================================');
console.log('🏁 Test Complete');
