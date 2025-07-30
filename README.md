# Chess Opening Explorer

A chess learning platform focused on opening study through client-side search, AI-enhanced content, and interactive exploration. Built for chess players who want to understand openings systematically.

## ✨ Core Capabilities

### **Search & Discovery**
- **1-5ms Search**: Client-side filtering across 12,377+ openings
- **ECO Classification**: Filter by standard chess opening codes (A-E) and strategic themes  
- **Popularity Rankings**: Based on 40M+ analyzed games from Lichess database
- **Real-time Results**: No API calls during search - all data loaded once per session

### **Learning Experience**
- **Interactive Chessboard**: Explore moves with full keyboard navigation
- **AI-Enhanced Content**: Google Vertex AI provides strategic analysis and complexity ratings
- **Educational Videos**: Curated YouTube content from 11+ trusted chess channels
- **Course Recommendations**: Expert-verified learning paths for each opening

### **Technical Architecture**
- **React 19 + TypeScript**: Type-safe, component-based frontend
- **Express.js API**: RESTful backend with caching
- **Hybrid Data Storage**: SQLite + JSON for performance
- **Monorepo Structure**: Clean separation with shared utilities

## 🏗️ Application Architecture

### **Pages & User Experience**
```
Landing Page
├── Hero Section (Search + "Surprise Me")
├── Popular Openings Grid (Category Filtering)
└── Statistics Showcase (12K+ openings, 1K+ videos)

Opening Detail Page  
├── Learning Path (70% width)
│   ├── Opening Header (Name, ECO, Popularity)
│   ├── FEN (position, copy, analyse on lichess) 
│   └── Interactive Chessboard (Move navigation)
└── Fact Sheet (30% width)
    ├── Game Statistics (Win/draw/loss rates)
    ├── Common Plans (Tabbed strategic content)
    ├── Strategic Description (AI-generated)
    └── Related Videos (Curated matches)
```

### **Core Functionality**
```
Search System
├── Client-Side Filtering (4.7MB dataset loaded once)
├── Popularity-Weighted Ranking (Game frequency scoring)
├── Keyboard Navigation (Arrow keys, Enter/Escape)
└── Category Filtering (ECO A-E classifications)

Chess Integration
├── Interactive Board (react-chessboard + chess.js)
├── Move Validation (FEN position handling)
├── Keyboard Controls (Left/Right arrows, Home/End)
└── Position Analysis (Strategic themes, complexity)

Data Enhancement
├── AI Analysis (Google Vertex AI strategic insights)
├── Popularity Metrics (Lichess game frequency analysis)
├── Video Matching (YouTube educational content)
└── Course Integration (Expert-curated learning paths)
```

## 🗃️ Data Architecture & Pipelines

### **Core Datasets**
```
data/
├── videos.sqlite (26MB)           # Main operational database
├── popularity_stats.json (4.7MB) # Complete search dataset 
├── eco/ (18MB)                    # ECO classifications + AI analysis
├── course_analysis/ (16KB)        # Course recommendation cache
└── Videos/ (114MB)                # Individual video metadata files
```

### **Production Scripts & Automation**
```
Video Pipeline (F04)
├── Channel-First Indexer → Fetch ALL videos from trusted channels
├── Video Matcher → Match openings to educational content  
├── Quality Filter → 60% noise reduction prioritizing education
└── Static File Generator → Optimize for web serving

AI Enrichment Pipeline (F01)  
├── LLM Enrichment → Strategic analysis via Google Vertex AI
├── Complexity Analysis → Beginner/Intermediate/Advanced ratings
├── Strategic Themes → Tactical vs positional categorization
└── Quality Validation → Conservative "if in doubt, exclude" policy

Popularity Analysis (F02)
├── Lichess Data Processing → 40M+ games analyzed
├── Frequency Ranking → Game volume-based popularity scores
├── Statistical Analysis → Win/draw/loss rate calculations  
└── Trend Analysis → Opening popularity over time

Course Integration (F03) [Backend Complete]
├── AI Course Discovery → LLM-powered course recommendations
├── Manual URL Verification → Human validation (95% URL hallucination rate)
├── Quality Scoring → Multi-factor course quality assessment
└── API Integration → Fast FEN-based course lookup
```

## 🛠️ Technology Stack

### **Frontend Stack**
- **React 19**: Latest React with concurrent features
- **TypeScript**: Strict typing for reliability  
- **Vite**: Fast development server and building
- **React Router**: Client-side routing
- **Chess.js**: Move validation and game logic
- **React-Chessboard**: Interactive chess board component

### **Backend Stack**  
- **Node.js + Express**: RESTful API server
- **SQLite**: Operational data storage
- **JSON Files**: Static data serving
- **Jest**: Testing with mocking

### **AI & External Services**
- **Google Vertex AI**: Strategic analysis generation
- **YouTube Data API**: Educational video discovery  
- **Lichess Database**: Popularity statistics source

## 🎨 Design System & Styling

### **CSS Architecture (Single-File Approach)**
```
packages/web/src/styles/simplified.css (2,100+ lines)
├── CSS Custom Properties (Consistent theming)
├── Component-Specific Styles (All UI components)
├── Responsive Design (Mobile-first approach)
└── Utility Classes (Reusable patterns)

Benefits:
✅ Zero CSS conflicts (single source of truth)
✅ Fast loading (one CSS bundle)
✅ Easy maintenance (all styles in one place)
✅ Consistent theming (CSS variables throughout)
```

### **Component Library**
```
Shared Components
├── SearchBar (Landing/header variants, keyboard navigation)
├── OpeningCard (Featured/compact/list layouts)
├── PopularityIndicator (1-10 scoring with color coding)
└── ChessBoard Integration (Move navigation, position display)

Page-Specific Components  
├── Landing: PopularOpeningsGrid, StatisticsShowcase
├── Detail: OpeningHeader, DescriptionCard, CommonPlans
└── Layout: Navigation, FooterContent, ErrorBoundaries
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm

### Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies** from the project root:
    ```bash
    npm install
    ```

3.  **Download ECO data**:
    This command populates the `data/eco` directory with the necessary chess opening files.
    ```bash
    npm run eco:import
    ```

4.  **Set up environment variables**:
    Copy the example environment file. This is required for the LLM enrichment features.
    ```bash
    cp .env.example .env
    ```
    Then, edit `.env` and add your Google Cloud credentials.

### Running the Application

Start both the backend and frontend servers concurrently:
```bash
npm run dev
```
-   **Backend API**: `http://localhost:3010`
-   **Frontend App**: `http://localhost:3000`

### Running Tests

Execute the entire test suite:
```bash
npm test
```

## 🗺️ Development Roadmap

The project has a stable architecture and is ready for new features. Current roadmap includes:

-   **✅ F03: Course Recommendation Data Pipeline**: Manually curate and integrate expert course recommendations. **(COMPLETED)**
-   **F05: Enhanced Search Capabilities**: Evolve the search to understand natural language and strategic concepts.

For more details, see the full list of [Product Requirements Documents](docs/).

## 📚 Documentation

-   **[CLAUDE.md](CLAUDE.md)**: The operational framework for the AI agent, detailing TDD workflows and development protocols.
-   **[memory_bank.md](memory_bank.md)**: The project's long-term memory, containing architectural decisions, API contracts, and other critical context.
-   **[Implementation Docs](docs/)**: Detailed technical documentation for completed features.
-   **[Archived PRDs](docs/archive/)**: Historical product requirements for completed features.




