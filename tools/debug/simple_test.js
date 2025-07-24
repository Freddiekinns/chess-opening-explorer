#!/usr/bin/env node

/**
 * Simple test to check if the issue is with the LLM service or environment
 */

require('dotenv').config();

console.log('🔍 Simple environment test...');
console.log('- GOOGLE_APPLICATION_CREDENTIALS_JSON present:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
console.log('- NODE_ENV:', process.env.NODE_ENV);

try {
  const LLMService = require('../../packages/api/src/services/llm-service');
  console.log('✅ LLM service module loaded successfully');
  
  const llmService = new LLMService();
  console.log('✅ LLM service instance created successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('🏁 Test completed');
