#!/usr/bin/env node

/**
 * Test the actual course analysis prompt with debugging
 * Web grounding disabled to avoid costs during debugging
 */

require('dotenv').config();

async function testCourseAnalysis() {
  try {
    console.log('🔍 Testing actual course analysis prompt WITH web grounding...');
    
    const { VertexAI } = require('@google-cloud/vertexai');
    const config = require('../../packages/api/src/config/enrichment-config');
    const fs = require('fs');
    const path = require('path');
    
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
    
    // Create model WITH web grounding
    const model = vertexAI.getGenerativeModel({
      model: config.model.name,
      generationConfig: {
        ...config.model.generationConfig,
        responseMimeType: 'application/json'
      },
      tools: config.tools // This enables web grounding
    });
    console.log('✅ Model created WITH web grounding');
    
    // Load the actual course analysis prompt
    const promptPath = path.join(__dirname, '../../prompts/course_analysis_prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    console.log('📄 Prompt loaded, length:', promptTemplate.length);
    
    // Test opening data - Use the actual King's Pawn Game that failed
    const testOpening = {
      rank: 1,
      games_analyzed: 3778178876,
      name: "King's Pawn Game",
      moves: "1. e4",
      eco: "B00",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      isEcoRoot: true,
      popularity_score: 10
    };
    
    // Build the complete prompt
    const prompt = promptTemplate.replace(
      /```json\s*{[^}]*}\s*```/,
      `\`\`\`json\n${JSON.stringify(testOpening, null, 2)}\n\`\`\``
    );
    
    console.log('📝 Sending course analysis prompt...');
    console.log('📏 Prompt length:', prompt.length);
    
    const response = await model.generateContent(prompt);
    
    console.log('✅ Response received');
    
    // Debug the full response structure
    console.log('🔍 Response structure:', {
      hasCandidates: !!response.response.candidates,
      candidatesLength: response.response.candidates ? response.response.candidates.length : 0,
      hasUsageMetadata: !!response.response.usageMetadata,
      hasPromptFeedback: !!response.response.promptFeedback
    });
    
    // Check for prompt feedback (safety filters)
    if (response.response.promptFeedback) {
      console.log('⚠️  Prompt feedback:', response.response.promptFeedback);
    }
    
    // Check response structure
    if (!response.response.candidates || response.response.candidates.length === 0) {
      console.error('❌ No candidates in response');
      console.log('🔍 Full response:', JSON.stringify(response.response, null, 2));
      return;
    }
    
    const candidate = response.response.candidates[0];
    console.log('🔍 Candidate structure:', {
      hasContent: !!candidate.content,
      hasFinishReason: !!candidate.finishReason,
      finishReason: candidate.finishReason,
      hasSafetyRatings: !!candidate.safetyRatings
    });
    
    if (candidate.safetyRatings) {
      console.log('🔍 Safety ratings:', candidate.safetyRatings);
    }
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('❌ No content in response');
      console.log('🔍 Full candidate:', JSON.stringify(candidate, null, 2));
      return;
    }
    
    const responseText = candidate.content.parts[0].text;
    console.log('📄 Raw response length:', responseText.length);
    console.log('📄 First 200 chars:', responseText.substring(0, 200));
    console.log('📄 Last 200 chars:', responseText.substring(Math.max(0, responseText.length - 200)));
    
    // Try to parse
    try {
      const parsed = JSON.parse(responseText.trim());
      console.log('✅ JSON parsed successfully!');
      console.log('📊 Structure:', {
        has_analysis_for_opening: !!parsed.analysis_for_opening,
        has_found_courses: !!parsed.found_courses,
        courses_count: parsed.found_courses ? parsed.found_courses.length : 0
      });
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('🔍 Trying to clean up response...');
      
      // Apply the same cleaning logic from the service
      let cleanedResponse = responseText.trim();
      
      // Remove common prefixes
      const commonPrefixes = [
        'Here is the JSON requested:',
        'Here is the JSON response:',
        'Here is the JSON output:',
        'Here is the JSON:',
        'Here is the requested JSON:',
        'The JSON response is:',
        'JSON response:',
        'Response:'
      ];
      
      for (const prefix of commonPrefixes) {
        if (cleanedResponse.startsWith(prefix)) {
          cleanedResponse = cleanedResponse.substring(prefix.length).trim();
          console.log('🧹 Removed prefix:', prefix);
          break;
        }
      }
      
      // Try to extract JSON
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
        console.log('🧹 Extracted JSON match');
      }
      
      try {
        const parsed = JSON.parse(cleanedResponse);
        console.log('✅ JSON parsed after cleaning!');
        console.log('📊 Structure:', {
          has_analysis_for_opening: !!parsed.analysis_for_opening,
          has_found_courses: !!parsed.found_courses,
          courses_count: parsed.found_courses ? parsed.found_courses.length : 0
        });
      } catch (finalError) {
        console.error('❌ Still failed after cleaning:', finalError.message);
        console.log('📄 Cleaned response first 500 chars:', cleanedResponse.substring(0, 500));
      }
    }
    
    // Check usage metadata
    if (response.response.usageMetadata) {
      console.log('📊 Usage:', response.response.usageMetadata);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testCourseAnalysis();
