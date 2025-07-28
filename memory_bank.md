# **Memory Bank: Long-Term Context for Chess Trainer Project**
test
## **Purpose**
This memory bank serves as persistent storage for an AI agent working on the Chess Opening Explorer project. It enables the agent to:
- **Maintain context** across multiple development sessions
- **Remember architectural decisions** and avoid contradicting past choices
- **Understand project structure** and key technical patterns
- **Access critical API contracts** and data organization
- **Apply consistent development practices** (TDD, testing patterns, AI integration guidelines)

This file should be consulted before making any architectural changes or implementing new features to ensure consistency and avoid repeating past mistakes.

---

## **📋 Project Overview**

### **Project Type**: High-Performance Chess Opening Explorer
- **Frontend**: React/TypeScript with Vite (client-side search, instant results)
- **Backend**: Node.js/Express API (RESTful endpoints)
- **Database**: SQLite for operational data + JSON files for frontend serving
- **External APIs**: Google Vertex AI (Gemini 2.5 Pro), YouTube Data API v3, Lichess Database API
- **Testing**: Jest with comprehensive mocking
- **Data**: 12,377+ chess openings with popularity stats, videos, and course recommendations

### **Core Architecture Pattern**: Monorepo with Data-Driven Frontend
```
/packages/
  /api/     - Backend services and data processing
  /shared/  - Common types/utilities  
  /web/     - Frontend application (React/TypeScript)
/data/      - Core operational data (SQLite DB, JSON files, ECO data)
/public/    - Static API files for frontend serving
/tools/     - Data processing scripts (production/, video-pipeline/, validation/, etc.)
/tests/     - Cross-package integration tests
```

---

## **🏗️ Key Architectural Decisions**

### **AD-001: TDD-First Development Approach** 
- **Decision**: All new features must follow Red-Green-Refactor TDD cycle
- **Implementation**: Use CLAUDE.md framework with persona delegation
- **Status**: Active

### **AD-002: Mock-First Testing Strategy**
- **Decision**: Unit tests MUST mock all external dependencies (APIs, databases, file I/O)
- **Rationale**: Fast, deterministic tests that don't incur costs or require network access
- **Status**: Active

### **AD-003: CSS Design System Architecture** 
- **Decision**: Centralized CSS architecture using design tokens and BEM methodology
- **Implementation**: 
  - **File Structure**: `/packages/web/src/styles/` with `design-system.css`, `components.css`, `main.css`, `index.css`
  - **Design Tokens**: CSS custom properties for colors, typography, spacing, shadows, transitions
  - **Component Library**: Reusable `.btn`, `.form-input`, `.card`, `.pill` components using BEM naming
  - **TDD Validation**: Comprehensive test suite validates design tokens and component structure
  - **Legacy Migration**: Legacy CSS files archived in `/styles/legacy/` directory
- **Rationale**: Eliminates CSS duplication (4+ button implementations), ensures visual consistency, enables TDD for CSS architecture
- **Benefits**: 
  - **DRY**: Single source of truth for all UI components
  - **Performance**: Consolidated CSS bundle, no duplicate rules
  - **Accessibility**: WCAG 2.1 AA compliant focus states built-in
  - **Maintenance**: Easy to update brand colors/spacing globally via design tokens
- **Migration Pattern**: Component CSS files → Use design system classes → Archive legacy files
- **Status**: Implemented (OpeningExplorer, OpeningTrainer migrated)

### **AD-003: Channel-First Indexer Architecture**
- **Decision**: Revolutionary approach to video discovery using local indexing instead of expensive search
- **Key Innovation**: Get ALL videos from trusted channels, enrich only matches (no artificial limits)
- **Performance**: 1,000+ videos indexed from 11 channels, 99.9% quota savings vs search-based approach
- **Status**: Active - Production ready

### **AD-004: Conservative Data Quality for AI Content** 
- **Decision**: "If in doubt, exclude it" policy for AI-generated content
- **Rationale**: Discovered 95% URL hallucination rate in LLM-generated course data
- **Principle**: Use AI for discovery, humans for verification
- **Status**: Active - Critical for any future AI data generation

### **AD-005: SQLite + JSON Hybrid Storage**
- **Decision**: SQLite for operational data, JSON files for frontend serving
- **Rationale**: Fast client-side search, simple deployment, version control friendly
- **Current Scale**: 12,377+ openings, 4.7MB search dataset
- **Status**: Active

### **AD-006: Data Pipeline Architectural Patterns** (Added: 2025-07-23)
- **Decision**: Adopt standardized patterns for all data processing pipelines to ensure resilience and consistency.
- **Patterns**:
    - **Metadata Separation**: Processing metadata (e.g., `last_processed`, `status`) must be stored separately from core content data.
    - **Idempotency & Retries**: All processing steps must be idempotent (safely retriable). Implement intelligent retry logic (max 3 attempts) with exponential back-off for transient failures.
    - **Skip Logic**: Pipelines must include logic to skip items that have been successfully processed or have failed permanently. The reason for skipping must always be logged for debugging.
- **Rationale**: These patterns prevent data corruption, reduce wasted processing on repeated failures, and improve the overall robustness and maintainability of the data pipelines.
- **Status**: Active

---

## **📊 Current Implementation Status & Roadmap**

### **Performance Benchmarks**
- **Search Response Time**: 1-5ms (instant client-side filtering)
- **Initial Load Time**: 1-2 seconds (one-time data fetch)  
- **Memory Efficiency**: ~2-3MB for 12,377 openings
- **Zero Typing Lag**: No API calls during search input
- **Smart Ranking**: Exact matches first, popularity-weighted results

### **Completed Features**
- ✅ **F01**: LLM Enrichment Pipeline (Google Vertex AI integration)
- ✅ **F02**: Game Data Popularity Analysis (Lichess data processing)
- ✅ **F03**: Course Recommendation Data Pipeline (Complete backend with API endpoints)
- ✅ **F04**: YouTube Video Data Pipeline (Channel-First Indexer - Revolutionary architecture with 1,000+ videos indexed, ALL videos from channels)

---

## **📁 Data Organization & Architecture**

### **Core Data Files**
```
data/
├── videos.sqlite                    # Main database (26MB) - openings, videos, relationships
├── popularity_stats.json            # All opening statistics (4.7MB) - 12,377 positions with ratings/frequencies
├── opening_popularity_data.json     # Top 185 openings (71KB) - ranked by game volume
├── channel_first_index.json         # Video metadata cache (114MB) - full YouTube channel data
├── eco/                            # ECO classification data (18MB total)
│   ├── ecoA.json                   # A00-A99 openings with AI analysis
│   ├── ecoB.json                   # B00-B99 openings 
│   ├── ecoC.json                   # C00-C99 openings
│   ├── ecoD.json                   # D00-D99 openings
│   └── ecoE.json                   # E00-E99 openings
└── course_analysis/                # Course recommendation cache (16KB)
    ├── by_opening/                 # Individual opening course analysis
    └── debug/                      # Processing logs
```

### **Public API Files**
```
public/api/openings/
├── {fen-id}.json                   # Individual opening files with videos/metadata
└── ...                             # 12,377+ opening-specific files
```

### **Package Data**
```
packages/api/src/data/
├── mock_popularity_stats.json      # Development mock data
├── courses.json                    # Course recommendation data
└── ...                             # Other development fixtures
```

### **Data Usage Patterns**

**For Frontend Search:**
- `popularity_stats.json` (4.7MB) - Complete search dataset, loaded once
- Individual opening files in `public/api/openings/` - Lazy loaded for detail pages

**For Backend Processing:**
- `videos.sqlite` - Primary operational database for queries and relationships
- `channel_first_index.json` - Source data for video pipeline processing
- `eco/*.json` - ECO classification and AI-enriched opening data

**For Development/Testing:**
- `packages/api/src/data/mock_*.json` - Fast, reliable mock data
- `course_analysis/` - Cached course discovery results

### **File Relationships**
- `videos.sqlite` ↔ `public/api/openings/*.json` (generated from database)
- `popularity_stats.json` ↔ `opening_popularity_data.json` (filtered subset)
- `eco/*.json` → AI analysis data merged into other files
- `channel_first_index.json` → processed into `videos.sqlite`

### **Data Maintenance Notes**
- **No Search Index Needed**: Full `popularity_stats.json` (4.7MB) provides complete search capability
- **Static Structure**: Current organization optimized for script dependencies - avoid moving core files
- **Size Management**: `channel_first_index.json` (114MB) is largest file but essential for video pipeline
- **Frontend Serving**: Individual opening files in `public/api/` enable efficient lazy loading
- **Script Dependencies**: Multiple tools reference `data/videos.sqlite`, `data/popularity_stats.json`, `data/opening_popularity_data.json` - these paths are hardcoded
- **Future Enhancement**: Planned natural language search using description/alias/tag data from ECO files

### **Development Roadmap**
- 🔄 **F05**: Enhanced Search Capabilities
- 🔄 **F06**: Data-Driven Detail Page Content
- 🔄 **F07**: Opening Tree Navigation
- 🔄 **F08**: Video Carousel Component
- 🔄 **F09**: Development Scripts & Workflow
- 🔄 **F10**: Opening Analytics Dashboard
- 🔄 **F11**: Progressive Web App Features
- 🔄 **F12**: Error Handling & Production Polish

### **Technical Debt & Known Issues**
- **None currently identified** - recent Channel-First Indexer evolution achieved clean architecture
- **Major Cleanup Complete (July 20, 2025)**: Comprehensive cleanup removed all development/analysis scripts
  - Archived 20+ analysis scripts (`analyze_*.js`, `debug_*.js`, `test_*.js`, `fix_*.js`)
  - Removed old pipeline versions and development utilities
  - Current production state: 3 essential files properly organized in `tools/video-pipeline/`
    - `tools/video-pipeline/run_new_pipeline_fixed.js` (production pipeline)
    - `tools/video-pipeline/run_migration.js` (database setup)
    - `tools/video-pipeline/analyze_comprehensive_performance.js` (performance monitoring)

---

## **⚙️ Core Application Logic**

### **Backend API (Node.js/Express)**
The backend provides a high-performance RESTful API:
*   `GET /api/openings/all`: Fetches all 12,377+ openings for client-side search (one-time load)
*   `GET /api/openings/search?q=<query>`: Server-side search with caching and ranking (legacy support)
*   `GET /api/openings/:fen`: Fetches complete data for a single opening by FEN
*   `GET /api/openings/random`: Returns a random opening for exploration

**Performance Features:**
- ✅ **Server-side caching**: 5-minute TTL, 100 entry limit
- ✅ **Result limiting**: Maximum 50 results per search
- ✅ **Relevance ranking**: Exact matches first, then popularity-weighted
- ✅ **Search metrics**: Performance timing included in responses

### **Frontend (React + TypeScript)**
The frontend delivers an instant, responsive search experience:
*   **Client-side search**: Loads all openings once, then searches instantly without API calls
*   **Smart ranking**: Prioritizes exact matches, then partial matches, with popularity weighting
*   **Responsive UI**: Zero lag during typing, instant dropdown results
*   **Keyboard navigation**: Full arrow key and Enter/Escape support

---

## **🎨 UI/UX and Design Principles**

### **Design System Architecture (AD-003)**
- **CSS Architecture**: Centralized design system with tokens, components, and layout styles
- **File Structure**: `/packages/web/src/styles/` → `design-system.css`, `components.css`, `main.css`
- **Design Tokens**: CSS custom properties for consistent colors, typography, spacing
- **Component Library**: BEM-based reusable components (`.btn`, `.form-input`, `.card`, `.pill`)

### **Color System (Design Tokens)**
- **Primary Colors**:
  - `--color-brand-orange`: #ff8c00 (Primary brand color)
  - `--color-text-primary`: #2c3e50 (Main text)
  - `--color-text-secondary`: #6c757d (Secondary text)
  - `--color-bg-primary`: #ffffff (Main background)
  - `--color-bg-surface`: #f8f9fa (Card/panel backgrounds)
- **Semantic Colors**:
  - `--color-success`: #28a745 (Success states)
  - `--color-danger`: #dc3545 (Error states)  
  - `--color-warning`: #ffc107 (Warning states)
  - `--color-border`: #dee2e6 (Default borders)

### **Typography Scale**
- **Font Family**: `--font-family-base` (system fonts), `--font-family-mono` (monospace)
- **Font Sizes**: `--font-size-xs` to `--font-size-3xl` (12px to 36px scale)
- **Font Weights**: `--font-weight-normal` (400), `--font-weight-medium` (500), `--font-weight-bold` (700)

### **Spacing System**
- **Scale**: `--space-1` (4px) to `--space-16` (64px) in incremental steps
- **Usage**: Consistent padding, margins, gaps using design tokens

### **Component Standards**
- **Buttons**: Use `.btn .btn--primary/.btn--secondary/.btn--outline` classes
- **Forms**: Use `.form-input .form-input--lg/.form-input--sm` classes  
- **Cards**: Use `.card .card--interactive/.card--compact` classes
- **Pills/Tags**: Use `.pill .pill--eco` classes for category badges
- **Layout**: Use CSS Grid and Flexbox with design token spacing

### **Responsive Design**
- **Mobile-first**: Base styles for mobile, media queries for larger screens
- **Breakpoints**: 768px (tablet), 1024px (desktop)
- **Chess Board**: Responsive scaling (scale(0.8) on mobile, scale(0.7) on small screens)

---

## **🔌 Core API Contracts**

### **Chess Opening Schema**
```typescript
interface ChessOpening {
  rank: number;
  name: string;
  moves: string;
  eco: string;     // ECO code (A00-E99)
  fen: string;     // Standard FEN notation
}
```

### **Backend API Endpoints**
- `GET /api/openings/all`: Fetches all 12,377+ openings for client-side search
- `GET /api/openings/:fen`: Fetches complete data for a single opening by FEN
- `GET /api/openings/random`: Returns a random opening for exploration

### **AI Content Quality Guidelines**
- **High Accuracy**: Course titles, authors, platforms, FEN generation
- **Low Accuracy**: URLs (95% hallucination), social proof data (53% fabrication)
- **Principle**: Use AI for discovery, humans for verification

---

## **⚡ Performance Standards**

### **Test Performance Targets**
- **Unit tests**: <1 second each, <10 seconds total suite
- **Integration tests**: <5 seconds each (respect Jest default)
- **Mock all external dependencies**: APIs, databases, file I/O
- **Clean up**: Remove test artifacts, reset mocks between tests

### **API Performance Requirements**
- **Course enrichment**: Target <$0.10 per opening analysis
- **Batch processing**: Configurable batch sizes with cost limits
- **Checkpointing**: File-based resumability for long-running processes
- **Caching**: Avoid re-processing existing analyses

---

## **🔒 Security Constraints**

### **Environment Variables Required**
```bash
# Google Cloud Credentials (JSON as string)
GOOGLE_APPLICATION_CREDENTIALS_JSON="{...}"

# YouTube API Key
YOUTUBE_API_KEY="..."
```

### **Security Rules**
- **No hardcoded secrets** in any code files
- **Input validation** on all API boundaries
- **Parameterized queries** to prevent SQL injection
- **No sensitive data in logs** (PII, API keys, tokens)

---

## **🛠️ Development Patterns**

### **File Naming Conventions**
- **Tests**: `*.test.js` in corresponding directories
- **Mock files**: `__mocks__/` directories alongside source
- **Config files**: Environment-specific with `.env` fallbacks
- **Generated files**: Use FEN-to-filename sanitization (underscores for non-alphanumeric)

### **Error Handling Patterns**
- **External API failures**: Implement retry logic with exponential backoff
- **Validation errors**: Clear messages with specific field information
- **Cost limit breaches**: Fail fast with cost tracking details
- **Test failures**: Include context about what was being tested

---

## **🔧 Development Guidelines**

### **TDD Workflow**
1. **Red Phase**: Write failing tests with mocked dependencies
2. **Green Phase**: Implement minimal code to pass tests  
3. **Refactor Phase**: Improve code while maintaining tests

### **Critical Patterns**
- **Always mock external dependencies** (APIs, databases, file I/O) in tests
- **Use NODE_ENV detection** for test vs production behavior
- **Build validation tools** before deploying AI-generated content
- **Conservative AI approach**: Remove problematic fields rather than fixing hallucination

### **Common Anti-Patterns to Avoid**
- **Never** use real API calls in tests (incurs costs, breaks determinism)
- **Never** trust AI-generated URLs without manual verification (95% hallucination rate)
- **Don't** skip error checking after implementation changes
- **Avoid** moving core data files - scripts have hardcoded paths
- **Don't** create component-specific CSS files - use design system components instead
- **Avoid** hardcoded colors/spacing in CSS - use design tokens (CSS custom properties)
- **Never** implement duplicate button/form styles - use centralized component library

### **Critical Development Patterns**
1. **CSS Architecture**: Use design system tokens → component classes → chess-specific layout
2. **TDD for CSS**: Validate design tokens and component structure through comprehensive tests
3. **Migration Strategy**: Archive legacy CSS → Update imports → Use design system classes
4. **Component Naming**: Follow BEM methodology for predictable class structure (.btn .btn--primary)

### **Critical AI Integration Lessons**
1. **Validate Before Deploy**: Build validation tools before deploying AI-generated content
2. **Conservative Schema Design**: Remove fields prone to hallucination rather than fixing them
3. **Hybrid Workflows**: AI excels at discovery, humans excel at verification
4. **Quality Over Quantity**: Better to have fewer verified items than many unverified ones

### **Memory Bank Maintenance**
Update this file when:
- New architectural decisions are made
- API contracts change significantly
- New security constraints discovered
- AI quality patterns are discovered

---

*Last Updated: 2025-07-28 - CSS Design System Architecture Implementation*
*Next Review: When significant architectural changes are proposed*
