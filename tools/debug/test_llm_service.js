#!/usr/bin/env node

/**
 * Test the LLM service directly to see what response it generates
 */

require('dotenv').config();
const LLMService = require('../../packages/api/src/services/llm-service');
const fs = require('fs');
const path = require('path');

async function testLLMService() {
  try {
    console.log('🔍 Testing LLM service directly...');
    
    const llmService = new LLMService();
    
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
    const promptPath = path.join(__dirname, '../../prompts/course_analysis_prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    
    console.log('📝 Calling LLM service with web grounding disabled...');
    
    const result = await llmService.generateCourseAnalysis(inputPayload, promptTemplate, false);
    
    console.log('✅ Success! Response structure:');
    console.log('- content keys:', Object.keys(result.content));
    console.log('- found courses:', result.content.found_courses.length);
    console.log('- usage tokens:', result.usage.total_tokens);
    
    // Save the raw response for inspection
    const outputPath = path.join(__dirname, '../../data/course_analysis/debug/debug_response.json');
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, JSON.stringify(result.content, null, 2));
    console.log('💾 Saved response to debug_response.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Show more details about the error
    if (error.message.includes('Invalid JSON response')) {
      console.log('🔍 JSON parsing error detected');
    }
  }
}

testLLMService();
