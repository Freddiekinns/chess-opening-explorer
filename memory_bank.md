# **Memory Bank: Chess Opening Explorer AI Context**

*Streamlined for AI agent efficiency - Essential decision-making context only*

## **🎯 Quick Reference**

### **Project Type**: High-Performance Chess Opening Explorer
- **Tech Stack**: React 19/TypeScript + Vite, Node.js/Express, SQLite/JSON hybrid
- **Scale**: 12,377+ openings, 1,000+ videos, 40M+ games analyzed
- **Performance**: 1-5ms search, client-side filtering, zero typing lag
- **External APIs**: Google Vertex AI, YouTube Data API, Lichess Database

## **🏗️ Critical Architecture Decisions**

### **AD-003: Single CSS File Architecture (CRITICAL)**
- **File**: `/packages/web/src/styles/simplified.css` (2,100+ lines)
- **Rule**: NEVER create separate CSS files - always add to simplified.css
- **Benefits**: Zero conflicts, single bundle, consistent theming
- **CSS Variables**: All colors/spacing use CSS custom properties

### **AD-004: Channel-First Video Pipeline**
- **Innovation**: Index ALL videos from trusted channels first (not search-based)
- **Result**: 1,000+ videos, 99.9% quota savings, comprehensive coverage
- **Files**: `tools/production/run-channel-first-pipeline.js`

### **AD-005: Conservative AI Content Policy**
- **Rule**: "If in doubt, exclude it" - 95% URL hallucination rate discovered
- **Pattern**: AI for discovery, humans for verification
- **Quality**: Strategic content (85-95% accurate), URLs (5% accurate)

### **AD-006: Data Processing Patterns**
- **Idempotency**: All processing steps must be safely retriable
- **Metadata separation**: Store processing status separately from content
- **Skip logic**: Skip already processed/failed items with logging

---

## **📁 Key File Locations**

```
packages/web/src/
├── pages/                        # LandingPage.tsx, OpeningDetailPage.tsx
├── components/
│   ├── shared/                   # SearchBar, OpeningCard, PopularityIndicator
│   ├── detail/                   # OpeningHeader, VideoGallery, CommonPlans
│   ├── landing/                  # PopularOpeningsGrid, StatisticsShowcase
│   └── layout/                   # Layout, GlobalHeader
├── styles/simplified.css         # Single consolidated CSS (2,100+ lines)
└── utils/                        # Frontend utilities

packages/api/src/
├── routes/                       # openings.js, stats.js, courses.js
├── services/                     # eco-service.js, video-access-service.js
└── data/courses.json             # Course recommendations (F03 complete)

data/
├── popularity_stats.json         # 4.7MB search dataset (client-side)
├── eco/*.json                    # AI-enhanced opening analysis
├── videos.sqlite                 # Operational database (26MB)
└── Videos/*.json                 # Individual video metadata
```

---

## **🔌 Core API Contracts**

### **Chess Opening Schema**
```typescript
interface ChessOpening {
  rank: number;
  name: string;
  eco: string;     // ECO code (A00-E99)
  fen: string;     // Standard FEN notation
  moves: string;
  popularity_score: number;
  win_rate?: number;
  draw_rate?: number;
  loss_rate?: number;
}
```

### **Essential API Endpoints**
- `GET /api/openings/all`: Fetches all 12,377+ openings for client-side search (4.7MB)
- `GET /api/openings/fen/:fen`: Complete opening data by FEN position
- `GET /api/openings/random`: Random opening for exploration
- `GET /api/courses/:fen`: Course recommendations for position (F03 complete)

---

## **⚠️ Critical Development Rules**

### **CSS Architecture (AD-003)**
- **NEVER** create separate CSS files - always add to `simplified.css`
- **ALWAYS** use CSS variables for colors/spacing
- **File**: `/packages/web/src/styles/simplified.css` (2,100+ lines)

### **AI Content Quality (AD-005)**
- **Strategic content**: 85-95% accurate (safe to use)
- **URLs**: 5% accurate (NEVER trust without verification)
- **Policy**: "If in doubt, exclude it"

### **Testing Strategy (AD-002)**
- **Mock all externals**: APIs, databases, file I/O (never use real calls)
- **Location**: `/tests/unit/` directory only, run from project ROOT
- **Performance**: <1 second per test, deterministic results
- **Commands**: See `.github/instructions/dev-commands.instructions.md`

---

## **🛠️ Development Patterns**

### **TDD Workflow**
1. **Red Phase**: Write failing tests with mocked dependencies
2. **Green Phase**: Implement minimal code to pass tests  
3. **Refactor Phase**: Improve code while maintaining tests

### **File Naming Conventions**
- **Tests**: `*.test.js` (location defined in AD-002 above)
- **Mock files**: `__mocks__/` directories alongside source
- **Config files**: Environment-specific with `.env` fallbacks
- **Generated files**: Use FEN-to-filename sanitization

### **Critical Patterns**
- **Build validation tools** before deploying AI-generated content
- **Conservative AI approach**: Remove problematic fields rather than fixing hallucination
- **Use NODE_ENV detection** for test vs production behavior


### **Common Anti-Patterns to Avoid**
- **Never** use real API calls in tests (see AD-002 for testing strategy)
- **Never** trust AI-generated URLs without manual verification (95% hallucination rate)
- **Never** create separate CSS files - use single `simplified.css` approach
- **Never** duplicate styling logic - maintain all styles in consolidated CSS file
- **Don't** skip error checking after implementation changes
- **Avoid** moving core data files - scripts have hardcoded paths
- **Avoid** hardcoded colors/spacing in CSS - use CSS variables for consistency

---

## **🔒 Environment Variables**

```bash
# Google Cloud Credentials (JSON as string)
GOOGLE_APPLICATION_CREDENTIALS_JSON="{...}"

# YouTube API Key
YOUTUBE_API_KEY="..."
```

---

## **📊 Current Status**

### **Performance Benchmarks**
- **Search Response Time**: 1-5ms (instant client-side filtering)
- **Initial Load Time**: 1-2 seconds (one-time data fetch)  
- **Memory Efficiency**: ~2-3MB for 12,377 openings
- **Zero Typing Lag**: No API calls during search input

### **Completed Features**
- ✅ **F01**: LLM Enrichment Pipeline (Google Vertex AI integration)
- ✅ **F02**: Game Data Popularity Analysis (Lichess data processing)
- ✅ **F03**: Course Recommendation Data Pipeline (Complete backend with API endpoints)
- ✅ **F04**: YouTube Video Data Pipeline (Channel-First Indexer)

---

## **🧪 Development Commands**

**All development and testing commands**: See `.github/instructions/dev-commands.instructions.md`

**Quick Reference:**
- **Backend tests**: `npm run test:unit` (Jest, from root)
- **Frontend tests**: `cd packages/web && npm test` (Vitest)
- **Run servers**: `npm run dev` (both), `npm run dev:api`, `npm run dev:web`

---

## **📚 Detailed Documentation**

For comprehensive details, see:
- **Pipeline Architecture**: `docs/pipeline-architecture.md`
- **API Reference**: `docs/api-reference.md`
- **Design System**: `docs/design-system.md`
- **Application Flows**: `docs/user-flows.md`

---

## **🤖 Cline Integration Notes**

### **Tool Usage Patterns**
- **File Exploration**: Use `read_file` before making changes to understand context
- **Targeted Edits**: Prefer `replace_in_file` for specific changes over `write_to_file`
- **Command Execution**: Always run `npm run test:unit` from root after changes
- **Architecture Check**: Reference `.cline/cline_rules.md` for Cline-specific workflow

### **Cline Workflow Preferences**
- **Plan → Act → Verify**: Aligns with TDD Red → Green → Refactor
- **Iterative Development**: Make one change, test, then proceed
- **Context First**: Leverage Cline's file exploration before implementing changes
- **Reference Existing**: Use `.github/instructions/` files for specialized patterns

### **Critical Cline Reminders**
- **AD-003 (CSS)**: NEVER create separate CSS files - always add to `simplified.css`
- **Testing Location**: All tests in `tests/unit/` directory, run from project ROOT
- **Mock Strategy**: Mock all external dependencies (APIs, databases, file I/O)
- **Performance Target**: <200ms API responses, use client-side filtering

---

*Last Updated: 2025-08-05 - Added Cline integration for tool-based workflow*
*Target: ~270 lines with Cline integration*
