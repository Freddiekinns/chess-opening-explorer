#!/usr/bin/env node

/**
 * Debug script to test LLM response parsing
 */

require('dotenv').config();
const LLMService = require('../../packages/api/src/services/llm-service');

async function testLLMResponse() {
  try {
    console.log('🔍 Testing LLM response parsing...');
    
    // Check environment variables
    console.log('🔧 Environment check...');
    console.log('- GOOGLE_APPLICATION_CREDENTIALS_JSON present:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    
    const llmService = new LLMService();
    console.log('✅ LLM service created successfully');
    
    // Test opening data
    const testOpening = {
      name: "Sicilian Defense",
      eco: "B20",
      moves: "1. e4 c5",
      fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      rank: 5
    };
    
    // Create input payload
    const inputPayload = {
      openingToAnalyze: testOpening
    };
    
    // Get the course analysis prompt
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, '../../prompts/course_analysis_prompt.md');
    console.log('📄 Loading prompt from:', promptPath);
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    console.log('📄 Prompt loaded, length:', promptTemplate.length);
    
    console.log('📝 Calling LLM service (web grounding disabled for debugging)...');
    
    const result = await llmService.generateCourseAnalysis(inputPayload, promptTemplate, false);
    
    console.log('✅ Success! Result structure:');
    console.log('- content keys:', Object.keys(result.content));
    console.log('- usage:', result.usage);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If it's a JSON parsing error, let's see more details
    if (error.message.includes('Invalid JSON response')) {
      console.log('🔍 This appears to be a JSON parsing issue.');
      console.log('🔍 The error message contains the raw response fragment.');
      
      // Try to extract more details from the error message
      const responseMatch = error.message.match(/Response: (.+)$/);
      if (responseMatch) {
        const responseFragment = responseMatch[1];
        console.log('📝 Raw response fragment:', responseFragment);
        console.log('📏 Fragment length:', responseFragment.length);
        console.log('🔍 First 200 chars:', responseFragment.substring(0, 200));
        console.log('🔍 Last 200 chars:', responseFragment.substring(Math.max(0, responseFragment.length - 200)));
      }
    }
  }
}

testLLMResponse();
