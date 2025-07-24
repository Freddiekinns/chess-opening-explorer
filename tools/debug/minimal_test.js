#!/usr/bin/env node

/**
 * Minimal test to isolate the LLM service issue
 * Web grounding disabled to avoid costs during debugging
 */

require('dotenv').config();

async function minimalTest() {
  try {
    console.log('🔍 Minimal LLM service test (no web grounding)...');
    
    const { VertexAI } = require('@google-cloud/vertexai');
    const config = require('../../packages/api/src/config/enrichment-config');
    
    // Parse credentials
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('✅ Credentials parsed successfully');
    
    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: config.vertexAI.project,
      location: config.vertexAI.location,
      googleAuthOptions: { credentials }
    });
    console.log('✅ Vertex AI initialized');
    
    // Create model WITHOUT web grounding
    const model = vertexAI.getGenerativeModel({
      model: config.model.name,
      generationConfig: {
        ...config.model.generationConfig,
        responseMimeType: 'application/json'
      }
    });
    console.log('✅ Model created (no web grounding)');
    
    // Simple test prompt
    const testPrompt = `Return only this JSON object with no other text:
{
  "test": "success",
  "opening": "Sicilian Defense"
}`;
    
    console.log('📝 Sending simple test prompt...');
    const response = await model.generateContent(testPrompt);
    
    console.log('✅ Response received');
    console.log('📄 Raw response text:', response.response.candidates[0].content.parts[0].text);
    
    // Try to parse it
    const responseText = response.response.candidates[0].content.parts[0].text.trim();
    const parsed = JSON.parse(responseText);
    console.log('✅ JSON parsed successfully:', parsed);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

minimalTest();
