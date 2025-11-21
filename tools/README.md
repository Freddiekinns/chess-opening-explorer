# Tools Directory

This directory contains the operational tools for the Chess Trainer project.

## Directory Structure

```
tools/
├── video-pipeline/       # F04: YouTube Video Integration Pipeline
├── llm-enrichment/       # F01: LLM Content Enrichment (formerly 'production')
├── analysis/             # F02: Data Analysis & Statistics
├── data/                 # Shared data storage (SQLite DB, cache files)
└── packages/             # Shared internal packages
```

## 📹 Video Pipeline (`tools/video-pipeline/`)

Handles the discovery, enrichment, and matching of YouTube videos to chess openings.

### **How to Run**

**1. Backfill Historical Videos (Recommended for fresh DB)**
If the database is empty or you need to find videos for specific openings immediately:

```bash
node tools/video-pipeline/backfill-videos.js
```

_This searches YouTube for major openings and populates the database._

**2. Run the Main Pipeline**
To process RSS feeds, match videos, and generate static JSON files:

```bash
node tools/video-pipeline/index.js
```

_This will:_

- _Fetch new videos from configured RSS feeds._
- _Match them against the opening database._
- _Generate/Update static JSON files in `public/api/openings/`._

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
