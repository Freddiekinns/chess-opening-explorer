# Pipeline Architecture Documentation

*Comprehensive technical details for data processing pipelines*

## **Data Architecture & Storage Strategy**

### **Primary Data Files (Project Root /data/)**
```typescript
interface DataArchitecture {
  // Operational Database (26MB)
  'videos.sqlite': {
    purpose: 'Primary operational database for complex queries'
    tables: ['openings', 'videos', 'video_relationships', 'channels']
    usage: 'Backend services, data processing pipelines'
    relationships: 'Opening-to-video mappings, channel metadata'
  }
  
  // Frontend Serving (4.7MB → ~1.2MB gzipped)
  'popularity_stats.json': {
    purpose: 'Complete search dataset for client-side filtering'
    structure: '{ "fen_position": { name, eco, popularity_rank, stats... } }'
    usage: 'Loaded once per session for instant search'
    scale: '12,377+ positions with complete metadata'
  }
  
  // AI-Enhanced Classifications (18MB total)
  'eco/': {
    'ecoA.json': 'A00-A99 openings (Flank openings, irregular)'
    'ecoB.json': 'B00-B99 openings (Semi-open games)'
    'ecoC.json': 'C00-C99 openings (French Defense variants)'
    'ecoD.json': 'D00-D99 openings (Queen\'s Gambit systems)'
    'ecoE.json': 'E00-E99 openings (Indian defenses)'
    enhancement: 'AI-generated strategic analysis, complexity ratings'
    source: 'Google Vertex AI processing + human validation'
  }
  
  // Video Processing Cache (114MB)
  'channel_first_index.json': {
    purpose: 'Complete YouTube video metadata from trusted channels'
    innovation: 'Revolutionary approach - index ALL videos first'
    scale: '1,000+ educational videos from 11+ channels'
    benefits: '99.9% API quota savings vs search-based approach'
  }
  
  // Individual Video Files
  'Videos/': {
    structure: '{fen-id}.json files'
    purpose: 'Individual video metadata for specific positions'
    content: 'Matched videos, quality scores, educational value'
    serving: 'Lazy-loaded for detail pages'
  }
  
  // Course Recommendations (16KB)
  'course_analysis/': {
    'by_opening/': 'Individual opening course analysis'
    'debug/': 'Processing logs and validation data'
    status: 'Backend complete, frontend integration pending'
  }
}
```

### **Static API Serving (/public/api/)**
```typescript
interface StaticAPIServing {
  // Individual Opening Files (12,377+ files)
  'public/api/openings/': {
    pattern: '{fen-sanitized-id}.json'
    purpose: 'Lazy-loaded opening details for detail pages'
    content: 'Complete opening data + videos + relationships'
    generation: 'Auto-generated from SQLite database'
    serving: 'Direct CDN serving, no backend processing'
  }
  
  advantages: [
    'Zero backend load for opening details',
    'Perfect caching (immutable content)',
    'CDN-friendly static serving',
    'Version control friendly (individual files)'
  ]
}
```

## **Data Processing Pipelines**

### **F01: LLM Enrichment Pipeline (Google Vertex AI)**
```typescript
interface LLMEnrichmentPipeline {
  script: 'tools/production/enrich_openings_llm.js'
  aiModel: 'Google Vertex AI (Gemini 2.5 Pro)'
  
  process: {
    1: 'Identify openings missing analysis_json field'
    2: 'Generate strategic descriptions via AI'
    3: 'Extract complexity ratings (Beginner/Intermediate/Advanced)'
    4: 'Categorize tactical vs positional themes'
    5: 'Update ECO JSON files with enriched data'
  }
  
  qualityControl: {
    policy: 'Conservative - "if in doubt, exclude it"'
    validation: '95% URL hallucination rate discovered'
    approach: 'AI for discovery, humans for verification'
    reliability: 'High accuracy for strategic content, low for URLs'
  }
  
  usage: 'npm run enrich --batchSize=25'
  monitoring: 'tools/analysis/check_enrichment_status.py'
}
```

### **F02: Popularity Analysis Pipeline (Lichess Integration)**
```typescript
interface PopularityAnalysisPipeline {
  script: 'tools/analysis/analyze_lichess_popularity.py'
  dataSource: 'Lichess Database API (40M+ games analyzed)'
  
  process: {
    1: 'Fetch game data from Lichess API'
    2: 'Calculate opening frequency statistics'
    3: 'Generate win/draw/loss rate analysis'
    4: 'Rank openings by game volume'
    5: 'Export to popularity_stats.json'
  }
  
  metrics: {
    gamesAnalyzed: '40M+ games from Lichess'
    positionsTracked: '12,377+ unique positions'
    rankings: 'Game volume-based popularity scoring'
    statistics: 'Win rates, frequency, trend analysis'
  }
  
  output: 'data/popularity_stats.json (4.7MB complete dataset)'
}
```

### **F03: Course Recommendation Pipeline (COMPLETED)**
```typescript
interface CourseRecommendationPipeline {
  status: 'Backend Complete - Frontend Integration Pending'
  
  scripts: {
    enrichment: 'tools/production/enrich_course_data.js'
    integration: 'tools/production/integrate_course_data.js'
    validation: 'tools/validation/validate_course_data.js'
    manualVerification: 'tools/utilities/manual_url_enrichment.js'
  }
  
  process: {
    1: 'AI-powered course discovery via LLM'
    2: 'Manual URL verification (95% hallucination rate)'
    3: 'Quality scoring (authority, social proof, buzz)'
    4: 'Data integration and normalization'
    5: 'API service layer implementation'
  }
  
  backend: {
    service: 'packages/api/src/services/course-service.js'
    routes: 'packages/api/src/routes/courses.js'
    endpoints: ['GET /api/courses/:fen', 'GET /api/courses', 'GET /api/courses/stats']
    storage: 'packages/api/src/data/courses.json'
  }
  
  frontend: 'Integration pending - backend fully functional'
}
```

### **F04: Video Processing Pipeline (Revolutionary Architecture)**
```typescript
interface VideoProcessingPipeline {
  innovation: 'Channel-First Indexing (Revolutionary Approach)'
  script: 'tools/production/run-channel-first-pipeline.js'
  
  revolutionaryApproach: {
    traditional: 'Search API → Limited results → High quota usage'
    channelFirst: 'Index ALL videos from trusted channels → Match locally'
    benefits: [
      '99.9% API quota savings',
      'Comprehensive coverage (no artificial limits)',
      '1,000+ videos indexed vs ~100 with search',
      'Local matching = unlimited reprocessing'
    ]
  }
  
  trustedChannels: {
    count: '11+ verified educational chess channels'
    examples: ['Saint Louis Chess Club', 'Chess.com', 'GothamChess (educational content)']
    vetting: 'Manual channel verification for educational value'
    config: 'config/youtube_channels.json'
  }
  
  process: {
    1: 'Build comprehensive local index from ALL channel videos'
    2: 'Intelligent pattern matching (title, description, keywords)'
    3: 'Educational content prioritization (60% noise reduction)'
    4: 'Quality scoring and ranking'
    5: 'Generate optimized static files for web serving'
  }
  
  performance: {
    indexed: '1,000+ educational videos'
    channels: '11+ trusted sources'
    quotaUsage: '99.9% reduction vs search-based approach'
    coverage: 'Comprehensive (not limited by search quotas)'
  }
}
```

## **AI Integration & Quality Guidelines**

### **AI Content Quality Patterns**
```typescript
interface AIQualityGuidelines {
  highAccuracy: {
    content: ['Strategic descriptions', 'Complexity ratings', 'Thematic analysis']
    reliability: '85-95% accuracy'
    usage: 'Safe for automated processing'
    examples: 'Opening strategic themes, difficulty assessment'
  }
  
  lowAccuracy: {
    content: ['URLs', 'Social proof data', 'Specific statistics']
    reliability: '5-53% accuracy (95% URL hallucination rate)'
    requirement: 'Manual verification essential'
    approach: 'AI for discovery, humans for verification'
  }
  
  qualityPrinciples: {
    conservativePolicy: '"If in doubt, exclude it" - better fewer verified items'
    hybridWorkflow: 'AI excels at discovery, humans excel at verification'
    validationFirst: 'Build validation tools before deploying AI content'
    iterativeImprovement: 'Start conservative, expand based on validation results'
  }
}
```

---

*For quick reference, see: memory_bank.md*
