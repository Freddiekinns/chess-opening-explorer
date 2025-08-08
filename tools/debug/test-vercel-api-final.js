#!/usr/bin/env node

/**
 * Test Vercel API endpoint directly
 */

// Simulate Vercel environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

const vercelOpeningsAPI = require('../../api/openings');

console.log('🧪 Testing Vercel API Endpoint');
console.log('==========================================');

// Mock request and response
const mockReq = {
  method: 'GET',
  url: '/api/openings/popular-by-eco',
  headers: { host: 'localhost:3000' },
  query: { limit: 6 }
};

const mockRes = {
  status: (code) => ({
    json: (data) => console.log(`Status: ${code}`, JSON.stringify(data, null, 2)),
    end: () => console.log(`Status: ${code} (ended)`)
  }),
  json: (data) => {
    console.log('Status: 200');
    console.log('Response:', JSON.stringify(data, null, 2));
  },
  setHeader: () => {},
  end: () => {}
};

console.log('\n🚀 Calling Vercel API...');

try {
  vercelOpeningsAPI(mockReq, mockRes);
} catch (error) {
  console.log('❌ API Error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n==========================================');
console.log('🏁 Vercel API Test Complete');
