/**
 * LLM service for enrichment pipeline
 * Location: packages/api/src/services/llm-service.js
 */

const { VertexAI } = require('@google-cloud/vertexai');
const config = require('../config/enrichment-config');

class LLMService {
  constructor() {
    // Parse the JSON credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
    
    this.vertexAI = new VertexAI({
      project: config.vertexAI.project,
      location: config.vertexAI.location,
      googleAuthOptions: {
        credentials: credentials
      }
    });
    this.model = this.vertexAI.getGenerativeModel({
      model: config.model.name,
      generationConfig: config.model.generationConfig
    });
  }

  /**
   * Generate enrichment data for a chess opening
   * @param {Object} opening - Opening data with fen, eco, name, moves, src
   * @returns {Promise<Object>} Analysis object
   */
  async generateEnrichment(opening) {
    try {
      // Build the prompt using the template
      const prompt = this.buildPrompt(opening);
      
      // Call the LLM
      const response = await this.model.generateContent(prompt);
      
      // Validate response structure
      if (!response || !response.response) {
        throw new Error('No response received from LLM');
      }
      
      if (!response.response.candidates || response.response.candidates.length === 0) {
        throw new Error('No candidates in LLM response');
      }
      
      const candidate = response.response.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content in LLM response candidate');
      }
      
      // Extract and parse the response
      let responseText = candidate.content.parts[0].text;
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response text from LLM');
      }
      
      // Clean up response text - remove markdown code blocks if present
      responseText = responseText.replace(/```json\s*\n/g, '').replace(/\n```/g, '').trim();
      
      // Try to fix incomplete JSON responses
      if (!responseText.endsWith('}')) {
        // If response seems truncated, try to close it properly
        const openBraces = (responseText.match(/\{/g) || []).length;
        const closeBraces = (responseText.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          // Add missing closing braces
          responseText += '}'.repeat(openBraces - closeBraces);
        }
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract partial data
        throw new Error(`Invalid JSON response: ${jsonError.message}. Response length: ${responseText.length}, First 300 chars: ${responseText.substring(0, 300)}...`);
      }
      
      // Validate required fields
      if (!parsedResponse.description || !parsedResponse.style_tags || !parsedResponse.complexity) {
        throw new Error('Response missing required fields: description, style_tags, or complexity');
      }
      
      // Add metadata
      const enrichedAnalysis = this.processResponse(parsedResponse);
      
      return enrichedAnalysis;
    } catch (error) {
      throw new Error(`Failed to generate enrichment: ${error.message}`);
    }
  }

  /**
   * Build the prompt for the LLM using the template
   * @param {Object} opening - Opening data
   * @returns {string} Formatted prompt
   */
  buildPrompt(opening) {
    return config.promptTemplate
      .replace('{opening_name}', opening.name)
      .replace('{eco_code}', opening.eco)
      .replace('{moves}', opening.moves);
  }

  /**
   * Process the LLM response and add metadata
   * @param {Object} response - Raw LLM response
   * @returns {Object} Processed analysis object
   */
  processResponse(response) {
    // Add version and timestamp
    response.version = '1.0';
    response.last_enriched_at = new Date().toISOString();
    
    return response;
  }

  /**
   * Generate course analysis for a chess opening with web grounding
   * @param {Object} inputPayload - Opening data in the required format
   * @param {string} promptTemplate - The course analysis prompt template
   * @param {boolean} enableWebGrounding - Whether to enable web grounding
   * @returns {Promise<Object>} Course analysis result with usage data
   */
  async generateCourseAnalysis(inputPayload, promptTemplate, enableWebGrounding = true) {
    try {
      // Build the complete prompt by replacing the input payload
      const prompt = promptTemplate.replace(
        /```json\s*{[^}]*}\s*```/,
        `\`\`\`json\n${JSON.stringify(inputPayload.openingToAnalyze, null, 2)}\n\`\`\``
      );

      // Configure the model with web grounding if enabled
      let modelConfig = {
        model: config.model.name,
        generationConfig: {
          ...config.model.generationConfig,
          responseMimeType: 'application/json' // Request JSON response
        }
      };

      // Add web grounding configuration
      if (enableWebGrounding) {
        modelConfig.tools = [{
          googleSearch: {}
        }];
      }

      const model = this.vertexAI.getGenerativeModel(modelConfig);

      // Call the LLM
      const response = await model.generateContent(prompt);

      // Validate response structure
      if (!response || !response.response) {
        throw new Error('No response received from LLM');
      }

      if (!response.response.candidates || response.response.candidates.length === 0) {
        throw new Error('No candidates in LLM response');
      }

      const candidate = response.response.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content in LLM response candidate');
      }

      // Extract and parse the response
      let responseText = '';
      
      // Concatenate all parts of the response (web grounding can split responses)
      for (const part of candidate.content.parts) {
        if (part.text) {
          responseText += part.text;
        }
      }

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response text from LLM');
      }

      // Clean up response text - more aggressive JSON extraction
      responseText = responseText.trim();
      
      // Remove common prefixes that LLMs add
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
        if (responseText.startsWith(prefix)) {
          responseText = responseText.substring(prefix.length).trim();
          break;
        }
      }
      
      // Try to extract JSON from the response if it's wrapped in explanatory text
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      } else {
        // Look for ```json blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          responseText = codeBlockMatch[1];
        } else {
          // Try removing text before first {
          const firstBrace = responseText.indexOf('{');
          if (firstBrace > 0) {
            responseText = responseText.substring(firstBrace);
          }
        }
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response: ${jsonError.message}. Response: ${responseText.substring(0, 500)}...`);
      }

      // Extract usage information for cost tracking
      const usageData = response.response.usageMetadata || {};
      
      return {
        content: parsedResponse,
        usage: {
          input_tokens: usageData.promptTokenCount || 0,
          output_tokens: usageData.candidatesTokenCount || 0,
          grounding_queries: this.countGroundingQueries(response.response),
          total_tokens: usageData.totalTokenCount || 0
        }
      };

    } catch (error) {
      throw new Error(`Failed to generate course analysis: ${error.message}`);
    }
  }

  /**
   * Count grounding queries from response metadata
   * @param {Object} response - LLM response object
   * @returns {number} Number of grounding queries performed
   */
  countGroundingQueries(response) {
    // Extract grounding metadata if available
    if (response.candidates && response.candidates[0] && response.candidates[0].groundingMetadata) {
      const groundingMetadata = response.candidates[0].groundingMetadata;
      if (groundingMetadata.webSearchQueries) {
        return groundingMetadata.webSearchQueries.length;
      }
    }
    return 0;
  }
}

module.exports = LLMService;
