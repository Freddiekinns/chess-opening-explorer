/**
 * Configuration for LLM enrichment pipeline
 * Location: packages/api/src/config/enrichment-config.js
 */

module.exports = {
  // Vertex AI Model Configuration
  model: {
    name: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,  // Increased to 16384 to handle web grounding responses for broad openings
      topP: 0.8,
      topK: 40
    }
  },

  // Google Cloud Configuration
  vertexAI: {
    project: process.env.VERTEX_AI_PROJECT_ID || 'chess-ai-trainer',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1'
  },

  // Default batch processing settings
  batch: {
    defaultSize: 10,
    maxSize: 100,
    retryAttempts: 3,
    retryDelay: 1000 // milliseconds
  },

  // Prompt template for LLM
  promptTemplate: `You are a world-class chess expert and coach (2500+ FIDE) tasked with enriching a database. Your tone is clear, encouraging, and educational.

For the opening provided:
Name: "{opening_name}"
ECO Code: "{eco_code}"
Moves: "{moves}"

CRITICAL: Return ONLY valid JSON. No markdown, no commentary, no code blocks. Ensure all strings are properly escaped and the JSON is complete.

OUTPUT (Provide only the raw JSON object that strictly follows this format):
{
  "description": "A 2-3 sentence strategic overview. **Crucially, capture the character of the opening and the playing style it suits (e.g., 'a sharp, tactical battle that leads to open positions' or 'a quiet, strategic game focused on accumulating small advantages', or 'The Queen's Gambit Declined is a classical and robust defense, considered one of the most reliable responses to 1.d4. It aims to create a solid central pawn structure, leading to a strategically rich game where long-term planning takes precedence over immediate tactical skirmishes. This opening is ideal for patient players who excel at understanding pawn breaks, maneuvering pieces, and accumulating small, lasting advantages.').**",
  "style_tags": ["Array", "of 5-8", "relevant style tags like 'Aggressive', 'Positional', 'Solid', 'Gambit', 'System-based', 'Tactical', 'Strategic', 'Dynamic'"],
  "tactical_tags": ["Array", "of 3-6", "tactical elements like 'Pin', 'Fork', 'Skewer', 'Sacrifice', 'Attacking', 'Counterattack', 'Initiative', 'Tempo'"],
  "positional_tags": ["Array", "of 3-6", "positional concepts like 'Central Control', 'King Safety', 'Pawn Structure', 'Piece Activity', 'Weaknesses', 'Space Advantage'"],
  "player_style_tags": ["Array", "of 2-4", "player personality matches like 'Aggressive Player', 'Positional Player', 'Creative Player', 'Tactical Player'"],
  "phase_tags": ["Array", "of 2-4", "game phase focus like 'Opening Theory', 'Middlegame Plans', 'Endgame Transition', 'Long-term Strategy'"],
  "complexity": "Choose one: Beginner, Intermediate, or Advanced",
  "strategic_themes": ["Array", "of 2-4", "key strategic themes"],
  "common_plans": ["Array", "of 2-4", "typical middlegame plans for both sides"]
}

IMPORTANT: 
- Ensure all text is properly escaped for JSON. No unescaped quotes, no line breaks within strings, complete the entire JSON structure.`
};
