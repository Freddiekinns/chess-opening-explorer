# Tools Directory

This directory contains the operational tools for the Chess Trainer project.

## Directory Structure

```
tools/
├── analysis/             # F02: Data Analysis & Statistics
├── course-discovery/     # Lichess study import pipeline
├── llm-enrichment/       # F01: LLM Content Enrichment (formerly 'production')
├── video-pipeline/       # F04: YouTube Video Integration Pipeline
├── data/                 # Shared data storage (SQLite DB, cache files)
└── packages/             # Shared internal packages
```

## 📹 Video Pipeline (`tools/video-pipeline/`)

Handles the discovery, enrichment, and matching of YouTube videos to chess
openings. Unified pipeline with three modes.

### **How to Run**

**1. Incremental (default)** — discover new videos via RSS:

```bash
npm run pipeline
```

**2. Full Catalogue** — rebuild from all channel history (requires API key):

```bash
npm run pipeline:full
```

**3. Rematch** — re-score existing videos after scorer changes (zero API cost):

```bash
npm run pipeline:rematch
# After rematch, restore view counts/thumbnails:
node tools/video-pipeline/scripts/backfill-views.js
```

**4. Backfill specific openings** (optional, for fresh DB):

```bash
node tools/video-pipeline/backfill-videos.js
```

_See `tools/video-pipeline/README.md` for full documentation._

---

## 🧠 LLM Enrichment (`tools/llm-enrichment/`)

Enriches opening PGNs with textual explanations using an LLM.

### **How to Run**

```bash
node tools/llm-enrichment/enrich_openings_llm.js --help
```

_Common usage:_

```bash
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=10
```

---

## 📊 Analysis (`tools/analysis/`)

Tools for analyzing opening popularity and statistics.

### **How to Run**

```bash
node tools/analysis/analyze_top_openings.js
```

---

## 💾 Data (`tools/data/`)

Contains the persistent data stores:

- `videos.sqlite`: The main video database.
- `video_enrichment_cache.json`: Cache for YouTube API responses.
