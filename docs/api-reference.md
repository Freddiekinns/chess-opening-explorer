# API Reference Documentation

*Comprehensive API endpoint and service layer documentation*

## **Core API Endpoints & Data Flow**

### **Main Opening Data**
```typescript
interface APIEndpoints {
  'GET /api/openings/all': {
    purpose: 'Load complete dataset for client-side search'
    data: '12,377+ openings with popularity stats'
    caching: '5-minute TTL, optimized for frontend loading'
    size: '4.7MB (gzipped to ~1.2MB)'
    response: 'Array of ChessOpening objects'
  }
  
  'GET /api/openings/fen/:fen': {
    purpose: 'Get complete opening data by FEN position'
    includes: 'Analysis, stats, videos, family variations'
    source: 'ECO JSON files + video relationships'
    response: 'Complete opening object with related data'
  }
  
  'GET /api/openings/popular': {
    purpose: 'Top openings for landing page grid'
    data: 'Top 50 ranked by game frequency'
    filtering: 'Category support (ECO A-E)'
    response: 'Array of popular openings'
  }
  
  'GET /api/openings/random': {
    purpose: 'Random opening discovery'
    response: 'Single random opening object'
  }
}
```

### **Specialized Data Access**
```typescript
interface SpecializedEndpoints {
  'GET /api/openings/eco-analysis/:code': {
    purpose: 'ECO classification analysis'
    source: 'data/eco/*.json files'
    content: 'AI-generated descriptions, complexity, themes'
    response: 'ECO analysis object'
  }
  
  'GET /api/stats/:fen': {
    purpose: 'Popularity statistics for specific position'
    source: 'data/popularity_stats.json'
    metrics: 'Game count, win rates, frequency ranking'
    response: 'Statistics object'
  }
  
  'GET /api/openings/categories': {
    purpose: 'Available ECO classifications'
    response: 'Array of ECO categories (A-E)'
  }
  
  'GET /api/openings/stats': {
    purpose: 'Database statistics'
    response: 'Overall database metrics'
  }
}
```

### **Course Recommendations (F03 Complete)**
```typescript
interface CourseEndpoints {
  'GET /api/courses/:fen': {
    purpose: 'Course recommendations for position'
    source: 'packages/api/src/data/courses.json'
    validation: 'Human-verified URLs, quality scoring'
    response: 'Array of course objects for position'
  }
  
  'GET /api/courses': {
    purpose: 'All available courses'
    response: 'Complete course database'
  }
  
  'GET /api/courses/stats': {
    purpose: 'Course database statistics'
    response: 'Course metrics and coverage data'
  }
}
```

## **Service Layer Architecture**

### **ECO Service**
```typescript
interface EcoService {
  purpose: 'ECO data management + search functionality'
  location: 'packages/api/src/services/eco-service.js'
  
  methods: {
    'getAllOpenings()': {
      returns: 'Complete opening dataset'
      source: 'data/eco/*.json files'
      caching: 'In-memory caching for frequent lookups'
    }
    
    'getOpeningByFEN(fen)': {
      returns: 'Single opening lookup by FEN'
      validation: 'FEN format validation'
      error: 'Returns null if not found'
    }
    
    'getECOAnalysis(code)': {
      returns: 'AI analysis by ECO code'
      source: 'AI-enhanced ECO data'
      format: 'A00-E99 code validation'
    }
    
    'getRandomOpening()': {
      returns: 'Random opening selection'
      weighting: 'Popularity-weighted selection'
    }
    
    'getStatistics()': {
      returns: 'Database metrics'
      metrics: 'Count, categories, data sizes'
    }
  }
  
  dataSource: 'data/eco/*.json files'
  caching: 'In-memory caching for frequent lookups'
}
```

### **Course Service**
```typescript
interface CourseService {
  purpose: 'Course recommendation management'
  location: 'packages/api/src/services/course-service.js'
  
  methods: {
    'getCoursesByFen(fen)': {
      returns: 'Position-specific courses'
      filtering: 'Relevance scoring'
      validation: 'Human-verified URLs only'
    }
    
    'getAllCourses()': {
      returns: 'Complete course database'
      format: 'Structured course objects'
    }
    
    'getStatistics()': {
      returns: 'Course database metrics'
      metrics: 'Total courses, coverage, quality scores'
    }
  }
  
  dataSource: 'packages/api/src/data/courses.json'
  performance: 'JSON file loading with intelligent caching'
}
```

### **Video Access Service**
```typescript
interface VideoAccessService {
  purpose: 'Video metadata access + relationships'
  location: 'packages/api/src/services/video-access-service.js'
  
  methods: {
    'getVideosByFEN(fen)': {
      returns: 'Related educational videos'
      filtering: '60% noise reduction, education-first'
      quality: 'Educational value scoring'
    }
    
    'getVideoMetadata(id)': {
      returns: 'Individual video details'
      source: 'Channel-first indexed data'
    }
  }
  
  dataSources: [
    'data/Videos/*.json (individual video files)',
    'videos.sqlite (operational database)',
    'channel_first_index.json (comprehensive index)'
  ]
  
  filtering: '60% noise reduction, education-first prioritization'
}
```

## **Response Schemas**

### **Chess Opening Object**
```typescript
interface ChessOpening {
  rank: number;                    // Popularity ranking
  name: string;                    // Opening name
  eco: string;                     // ECO code (A00-E99)
  fen: string;                     // Standard FEN notation
  moves: string;                   // Move sequence
  popularity_score: number;        // Calculated popularity
  win_rate?: number;              // White win percentage
  draw_rate?: number;             // Draw percentage
  loss_rate?: number;             // Black win percentage
  analysis?: {                    // AI-generated analysis
    description: string;
    complexity: 'Beginner' | 'Intermediate' | 'Advanced';
    themes: string[];
  }
}
```

### **Course Object**
```typescript
interface Course {
  id: string;
  title: string;
  author: string;
  platform: string;
  url: string;                    // Human-verified URL
  relevance_score: number;        // Quality scoring
  opening_fen?: string;          // Associated position
  description?: string;
}
```

### **Video Object**
```typescript
interface Video {
  id: string;
  title: string;
  channel: string;
  url: string;
  duration: string;
  educational_score: number;      // Education prioritization
  relevance_score: number;        // Position relevance
  thumbnail_url?: string;
}
```

---

*For quick reference, see: memory_bank.md*
