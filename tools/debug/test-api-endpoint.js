#!/usr/bin/env node

// Simulate Vercel environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

console.log('🧪 Vercel API Endpoint Test');
console.log('==========================================');

// Test the actual API function
try {
  console.log('Testing /api/openings popular-by-eco endpoint...');
  
  // Load the openings route module (this is what Vercel will call)
  const handler = require('../../api/openings');
  
  // Create mock request and response objects
  const mockReq = {
    method: 'GET',
    url: '/api/openings/popular-by-eco',
    query: {},
    headers: {
      host: 'localhost:3000'
    }
  };
  
  const mockRes = {
    setHeader: (name, value) => {
      console.log(`Header: ${name}: ${value}`);
    },
    status: (code) => ({
      json: (data) => {
        console.log('Response Status:', code);
        console.log('Response Data Preview:');
        
        if (data && typeof data === 'object') {
          // Show summary of response
          if (data.success !== undefined) {
            console.log('  success:', data.success);
          }
          if (data.data) {
            console.log('  data keys:', Object.keys(data.data));
            Object.entries(data.data).forEach(([category, openings]) => {
              console.log(`  ${category}: ${openings.length} openings`);
              if (openings.length > 0) {
                console.log(`    Top: ${openings[0].name} (${openings[0].games_analyzed} games)`);
              }
            });
          }
          if (data.error) {
            console.log('  error:', data.error);
          }
        } else {
          console.log('  raw data:', data);
        }
      }
    }),
    json: (data) => {
      console.log('Response Status: 200');
      console.log('Response Data Preview:');
      
      if (data && typeof data === 'object') {
        if (data.success !== undefined) {
          console.log('  success:', data.success);
        }
        if (data.data) {
          console.log('  data keys:', Object.keys(data.data));
          Object.entries(data.data).forEach(([category, openings]) => {
            console.log(`  ${category}: ${openings.length} openings`);
            if (openings.length > 0) {
              console.log(`    Top: ${openings[0].name} (${openings[0].games_analyzed} games)`);
            }
          });
        }
      }
    }
  };
  
  // Call the handler
  handler(mockReq, mockRes);
  
} catch (error) {
  console.log('❌ API Error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('==========================================');
console.log('🏁 API Test Complete');
