# [TASK002] - Related Openings Navigation (ECO/Mainline Links)

**Status:** In Progress  
**Added:** 2025-09-07  
**Updated:** 2025-09-07  

## Original Request
Enable improved chess opening exploration from an opening detail page:
- Show other openings sharing the same ECO code.
- Provide a direct link to the mainline (if current is a variation).
- Future phase: related by name (phase 2), possibly richer relationships later.
Need planning, UI approach options, possibly a dummy prototype first.

## Thought Process
Objective: Increase user exploration efficiency by surfacing contextual siblings (same ECO) and mainline hierarchy.

Assumptions (to confirm):
- Data model clarified: FEN string is unique ID (key). Example JSON provided shows structure with fields: `eco`, `moves`, `name`, optional `isEcoRoot` (present ONLY for mainline), plus `aliases` object. No explicit parent reference; variations omit `isEcoRoot`.
- We will treat `isEcoRoot === true` as mainline; absence => variation. Derive eco code from `eco` field.
- We may create a synthetic `id` alias in frontend using FEN for routing if not already standardized.
- Data access currently via `ECOService`; we already have endpoints `/api/openings/eco/:code` and `/api/openings/fen/:fen` we can compose rather than a new service-level query if desired.
- Current opening detail page uses tabbed content (see attached UI) including Overview, Common Plans, Related Videos; potential new tab for "Related Openings" or inline card within Overview.

Key value:
- Faster navigation between variations.
- Clear pathway back to canonical mainline.
- Low cognitive load: lightweight list or pills rather than complex graph initially.

Constraints / Risks:
- ECO groups vary in size (some large) → need truncation or collapsible UI.
- Performance: batch load related openings in one request.
- Avoid UI clutter; keep above the fold minimal.

Phased Approach:
- Phase 1 (this task): ECO-based related list + mainline link.
- Phase 2: Name similarity heuristics (normalized tokens).
- Phase 3: Transposition / move tree graph (optional).
- Phase 4: Personalization (recently viewed / popularity).

Tab Integration Consideration:
Existing UI already employs a tab set including a "Related Videos" tab. Adding a "Related Openings" tab is low-friction (Option C variant). We'll still prototype Option A (inline card) for faster above-the-fold access. We can A/B the placement later.

## Implementation Plan
1. Validate data model (confirm fields for isMainline / variation classification).
2. Add repository/service method: getOpeningsByEco(ecoCode) returning list.
3. Derive mainline: first where isMainline=true OR fallback by rule.
4. Backend endpoint: GET /api/openings/{id}/related (returns: mainline, siblings, meta).
5. Frontend data hook/useRelatedOpenings(openingId).
6. UI Component <RelatedOpeningsPanel /> (compact mode and expanded mode).
7. Display strategy:
   - If current is variation: prominent "Go to Mainline" button.
   - List other variations (exclude current) with variation/mainline icon.
8. Truncation: If >10 siblings show first 10 + "Show All".
9. Skeleton loading state + graceful empty states.
10. Analytics hook (optional placeholder) for click tracking.
11. Unit tests: service, endpoint, component rendering states.
12. Documentation updates (progress.md + developer notes).
13. Phase 2 placeholder note in code (TODO).
14. Accessibility pass (ARIA list / button labels).
 15. (Optional) Add a dedicated tab variant if inline card proves visually heavy; reuse component core logic.

## Data Contract (Draft)
Endpoint: GET /api/openings/{id}/related  
Response:
```
{
  "current": { "id": "...", "name": "...", "ecoCode": "C65", "isMainline": false },
  "mainline": { "id": "...", "name": "..." } | null,
  "siblings": [
     { "id": "...", "name": "...", "isMainline": false, "typeIcon": "variation" }
  ],
  "counts": { "siblings": 7 },
  "ecoCode": "C65"
}
```

## UI Options (Evaluate)
Option A (Inline Section): Card titled "Related (ECO C65)" with pills/links. Minimal, fast.  
Option B (Sidebar Panel): Moves other metadata to panel; scalable for Phase 2.  
Option C (Tabbed): Tabs: Overview | Related. Clean separation; extra click.  

Recommendation: Start with Option A (fastest, minimal layout disruption) + ensure component isolation so migration to sidebar later is trivial.

Tab Option Evaluation (per new screenshot context):
- Pros: Keeps detail page layout consistent; heavy lists don't push content down; discoverable via tab label with count (e.g., Related (12)).
- Cons: Adds click friction for quick exploration; user may miss related list entirely if they don't switch tabs.
- Hybrid: Inline teaser (top 3 + "View all") that links to full tab. (Potential enhancement after baseline.)

## UI Decision (Hybrid Adopted 2025-09-07)
We will implement a Hybrid approach in Phase 1:
- Inline Teaser: Shows mainline (if not current) plus up to 3 top variations (sorted by games_analyzed) and a "View all (N)" link.
- Dedicated Tab: Full related openings list with truncation->expand beyond 10, accessible via standard tab navigation labelled `Related Openings (N)`.
- Rationale: Maximizes discoverability (user immediately sees related context) while preserving page cleanliness and offering deep exploration path.
- Implementation Notes: Core data hook + sorting logic shared; teaser consumes first slice of list; tab reuses same component with different props.

## Edge Cases
- Only opening in ECO group → show "No other variations in ECO C65".
- Current already mainline → show variations list only, no button.
- Large list → truncate + expand.
- Missing mainline flag → fallback heuristic (shortest name? most referenced? mark unknown).

## Confirmed Decisions (2025-09-07)
- Truncation threshold: 10 siblings initially; inline "Show All" expands in-place (no pagination for Phase 1).
- Routing: Will reuse existing FEN-based detail routing (verify during implementation; fallback create helper to encode FEN safely).
- Prefetch (Best Practice): Implement lightweight prefetch on hover/focus of related link (deferred if complexity high; baseline fetch on mount only).
- Analytics: Deferred (emit no events yet; leave TODO hooks).
- Accessibility: Follow existing semantic + ARIA patterns (list semantics with role="list" / role="listitem").
- Large ECO sets: Use expansion only (no pagination) for now; if >50 after expansion, consider lazy rendering (Phase 1+ optional optimization).
- Sorting: Mainline first (if not current) then variations by descending `games_analyzed` (fallback alphabetical when equal or missing).
- Empty state copy: Use confirmed string; treat unexpected absence of other lines for non-root variation as soft error (log + show empty state).
- Hybrid Teaser + Tab adopted (teaser shows up to 3 items + CTA to tab).

## Open Follow-ups (Non-blocking)
- Verify presence of consistent detail route consuming FEN; document if slug alternative emerges.
- Consider hybrid teaser+tab after baseline.
- Determine threshold for lazy rendering (if performance impacted by very large lists).

## Performance Considerations
- Single backend call; avoid N+1.
- Cache related listings per opening (TTL e.g., 6h) since openings are static content.
- Return only fields needed (no full move trees in this call).

## Testing Strategy
- Service: returns correct segregation (current excluded from siblings).
- Endpoint: 404 when opening not found.
- UI: loading, empty, truncated, expanded states snapshot + interaction test.
- Accessibility: tab order, link roles.

## Future (Phase 2 Placeholder)
- Name similarity (normalized tokens, Levenshtein thresholds).
- "Also Known As" synonyms list.
- Popular transitions / transpositions.

## Progress Tracking

**Overall Status:** In Progress - 5%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | Confirm data model fields (isMainline, ecoCode) | Not Started | 2025-09-07 | |
| 2.1 | Confirm data model fields (isMainline, ecoCode) | Complete | 2025-09-07 | `isEcoRoot` flag confirmed; FEN acts as unique id |
| 2.2 | Define backend contract & DTO | In Progress | 2025-09-07 | Will integrate confirmed decisions |
| 2.2 | Define backend contract & DTO | Not Started | 2025-09-07 | Draft above |
| 2.3 | Implement repository query by ECO | Not Started | 2025-09-07 | |
| 2.4 | Implement service logic (mainline + siblings) | Not Started | 2025-09-07 | |
| 2.5 | Add API endpoint `/openings/{id}/related` | Not Started | 2025-09-07 | |
| 2.6 | Frontend data hook | Not Started | 2025-09-07 | |
| 2.7 | UI component (Option A) | Not Started | 2025-09-07 | |
| 2.7a | Teaser component variant | Not Started | 2025-09-07 | Inline top 3 + view all |
| 2.7b | Full tab component variant | Not Started | 2025-09-07 | Uses shared panel core |
| 2.8 | Truncation + expand interaction | Not Started | 2025-09-07 | |
| 2.9 | Unit tests (backend) | Not Started | 2025-09-07 | |
| 2.10 | Component tests (frontend) | Not Started | 2025-09-07 | |
| 2.11 | Accessibility & empty states | Not Started | 2025-09-07 | |
| 2.12 | Caching layer (optional) | Not Started | 2025-09-07 | |
| 2.13 | Documentation updates | Not Started | 2025-09-07 | |
| 2.14 | Phase 2 placeholder TODOs | Not Started | 2025-09-07 | |

## Progress Log
### 2025-09-07
- Created task file with full planning, design options, phased strategy, and subtasks.
- Awaiting confirmation of data model and preferred UI Option (A/B/C) before implementation.

## Release Summary (To Fill When Completed)
*Pending implementation.*
