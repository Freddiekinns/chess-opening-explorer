# Task 012: Video Pipeline Overhaul

**Status:** Pending
**Added:** 2026-03-15

---

## Context

The video pipeline has accumulated significant drift across two separate implementations
with conflicting logic, bonus-eligible channels that are never discovered, broken scorer
logic for agadmator, and no way to run a full historical catalogue rebuild.

---

## Problem Analysis

### Two pipelines with divergent logic

| | RSS Pipeline | Channel-First Pipeline |
|---|---|---|
| **Location** | `tools/video-pipeline/` | `packages/api/src/services/channel-first-video-pipeline.js` |
| **Discovery** | RSS (~15 most recent per channel, no API cost) | YouTube API `getChannelPlaylistItems` (full catalogue) |
| **Storage** | SQLite → static JSON → `api/data/video-index.json` (committed) | Local JSON index → ECO JSON files |
| **Matching** | Sophisticated (ECO family, 41 abbreviations, weighted scoring) | Separate simpler implementation |
| **Incremental?** | Upserts new videos each run | 7-day index cache only |

These have duplicate discovery and matching code with no clear owner. The channel-first
pipeline's only unique contribution is full-catalogue discovery via `getChannelPlaylistItems`.

### Data flow (current, to be preserved)

```
Pipeline (local) → SQLite (gitignored) → public/api/openings/{fen}.json
  → api/data/video-index.json (COMMITTED to repo, shared via git pull)
  → Vercel serves /api/openings/videos/*
```

Multi-machine access works via git: `api/data/video-index.json` is the shared artifact.
The SQLite DB is local/ephemeral and is rebuilt when the pipeline runs.

### Channel config vs. scorer mismatch

`video-matcher.js` grants bonuses to channels not in `youtube_channels.json`, so those
bonuses never fire in practice.

**premiumEducators (+40) — missing from channel config:**
- John Bartholomew
- Christof Sielecki (ChessExplained)
- `chess24` appears here AND in `entertainmentChannels` — direct contradiction; resolution:
  remove from premiumEducators, keep entertainment penalty

**goodEducators (+20) — missing from channel config:**
- PowerplayChess (Simon Williams)
- Remote Chess Academy (Igor Smirnov)
- TheChessWebsite
- IIChess

**In config but no bonus applied (oversight):**
- Chessbrah → add to `goodEducators`
- Ben Finegold → add to `goodEducators`

### agadmator wrongly penalised

agadmator is in `entertainmentChannels` (−30) AND has a hard-coded channel-specific
penalty (−50). But agadmator produces legitimate opening theory content. The real problem
is game-recap "vs" titles — which affects all channels equally (GothamChess, Chessbrah,
etc.). The current naive `title.includes('vs')` check penalises titles like
"Sicilian vs French".

### No full-catalogue rebuild mode

RSS only surfaces ~15 most recent videos per channel. Historical content (John
Bartholomew's "Chess Fundamentals" series, etc.) is never discovered. There is no
mechanism to trigger a full rebuild.

---

## Solution

### 1. Align channel config with scorer bonus lists
Add missing channels to `config/youtube_channels.json`:
- John Bartholomew (premium tier)
- Christof Sielecki / ChessExplained (premium tier)
- PowerplayChess / Simon Williams (standard tier)
- Remote Chess Academy / Igor Smirnov (standard tier)
- TheChessWebsite (standard tier)

Add `chess club and scholastic center` as alias on Saint Louis Chess Club entry.
Add Chessbrah and Ben Finegold to `goodEducators` in scorer.
Remove `chess24` from `premiumEducators` in scorer.

Note: channel IDs must be verified at implementation time via YouTube.

### 2. Fix agadmator + "vs" detection in `video-matcher.js`
- Remove `agadmator` from `entertainmentChannels` → move to `goodEducators`
- Delete the hard-coded agadmator-specific penalty block
- Replace `title.includes('vs')` with a targeted game-recap pattern:
  - Fire penalty for: `"Magnus vs Hikaru || ..."` or `"Carlsen vs Nepomniachtchi"` (proper names)
  - Do NOT fire for: `"Sicilian vs French"`, `"e4 vs d4"`, `"Attack vs Defense"`

### 3. Unified pipeline — three modes

Keep `tools/video-pipeline/` as the single authoritative pipeline. Extract
`getChannelPlaylistItems` from `channel-first-indexer.js` into a new
`tools/video-pipeline/lib/channel-discovery.js`. Delete the channel-first files.

| Mode | Command | Discovery | DB behaviour |
|---|---|---|---|
| `incremental` (default) | `npm run pipeline` | RSS (~15 recent per channel) | Upsert new only |
| `full` | `npm run pipeline:full` | YouTube API playlist (full history) | Upsert all + rematch |
| `rematch` | `npm run pipeline:rematch` | None (no API calls) | Clear `opening_videos` only, re-score all |

`rematch` mode re-scores existing DB videos with the updated scorer without using any API
quota — use this whenever scoring logic changes.

### 4. Delete channel-first pipeline
Once `pipeline:full` is verified, delete:
- `packages/api/src/services/channel-first-video-pipeline.js`
- `packages/api/src/services/channel-first-indexer.js`

Do not leave as silent dead code — they hold duplicate logic that creates confusion.

---

## Implementation Steps

1. **Channel config** — add missing channels to `config/youtube_channels.json`
2. **Scorer fixes** — `tools/video-pipeline/lib/video-matcher.js`: fix channel lists, agadmator, vs pattern
3. **`channel-discovery.js`** — new module: full-catalogue YouTube API discovery, same output shape as `rss-discovery.js`
4. **Pipeline orchestrator** — `tools/video-pipeline/index.js`: add `--mode=full` and `--rematch` flags
5. **Candidate filter** — `tools/video-pipeline/lib/candidate-filter.js`: tighten `rapid`, `wins`, `match` patterns
6. **Parallel RSS** — `tools/video-pipeline/lib/rss-discovery.js`: replace sequential loop with `Promise.all()`
7. **Scripts** — `package.json`: add `pipeline`, `pipeline:full`, `pipeline:rematch` commands
8. **Delete** channel-first files once unified pipeline is verified
9. **Tests**:
   - Extend `tools/video-pipeline/tests/video-matcher.test.js` — agadmator, vs pattern, new channel bonuses
   - New `tools/video-pipeline/tests/channel-discovery.test.js`
   - New `tools/video-pipeline/tests/pipeline-modes.test.js` — verify rematch/full behaviour
   - Remove/skip tests for deleted channel-first code
10. **Documentation** — `CLAUDE.md`, `tools/video-pipeline/README.md` (create), memory-bank files

---

## Critical Files

| File | Change |
|---|---|
| `config/youtube_channels.json` | Add 5+ missing channels |
| `tools/video-pipeline/lib/video-matcher.js` | Fix scorer |
| `tools/video-pipeline/lib/channel-discovery.js` | **New**: full-catalogue discovery |
| `tools/video-pipeline/index.js` | Add `--mode` and `--rematch` flags |
| `tools/video-pipeline/lib/candidate-filter.js` | Tighten filter terms |
| `tools/video-pipeline/lib/rss-discovery.js` | Parallelise fetches |
| `package.json` | Update pipeline scripts |
| `packages/api/src/services/channel-first-video-pipeline.js` | **Delete** |
| `packages/api/src/services/channel-first-indexer.js` | **Delete** |
| `tools/video-pipeline/tests/video-matcher.test.js` | Extend |
| `tools/video-pipeline/tests/channel-discovery.test.js` | **New** |
| `tools/video-pipeline/tests/pipeline-modes.test.js` | **New** |
| `CLAUDE.md` + memory-bank files | Docs |

---

## Verification

1. `npm test` — all existing tests pass after changes
2. `npm run pipeline:rematch` — confirm it clears `opening_videos` only, keeps `videos` table
3. Spot-check 3 openings: Sicilian Najdorf, London System, King's Indian — agadmator videos
   now appear and are relevant
4. Confirm `"Magnus vs Hikaru || ..."` titles still score below threshold (< 60)
5. `npm run pipeline` (incremental) — only processes new RSS videos, skips existing
6. `npm run build:vercel` — `api/data/video-index.json` regenerates correctly
