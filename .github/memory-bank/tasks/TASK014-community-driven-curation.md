# [TASK014] - Community-Driven Curation & Upvotes (Supabase Integration)

**Status:** Pending  
**Added:** 2026-03-17  
**Updated:** 2026-03-17

## 1. Problem Statement
The current list of videos and Lichess studies is static and automated. Users have no way to highlight the most helpful ones or share missing resources.

## 2. Proposed Solution (PRD)
Shift community tools toward **"User-Curated Learning"** to surface the best instructional materials.

### User Journey: Video Curation
1. **Engagement**: User watches a "Kings Gambit" video via our player and finds the explanation for the $f4$ pawn push especially clear.
2. **Action**: User clicks the "Up-vote" icon (thumb-up) on the video card. The count increments.
3. **Discovery**: A new user lands on "Kings Gambit" and sees the video gallery. The videos are sorted by "Community Helpful Count" first, followed by our automated relevance score.
4. **Contribution**: User has a specific YouTube link from a grandmaster that's better than our automated search. They click "Suggest Missing Video," paste the URL, and it is automatically added as "Community Suggested" for that ECO.

### User Journey: Study Curation
1. **Selection**: User opens a Lichess Study on the "Najdorf" and realizes it's the gold standard for that variation.
2. **Action**: User clicks "+5 Recommend" (a stronger upvote for studies).
3. **Down-votes**: If a study is broken or low quality, a "Flag for Review" or simple down-vote ensures the curator (system or admin) checks it.
4. **Visibility**: High-quality studies are highlighted with a "Top Recommended" banner.

### Features
- **Independent Rating Systems**: Distinct "Helpful" metrics for videos (instructional quality) vs studies (theoretical depth).
- **Public Suggestion Log**: A way to submit high-quality external resources (URLs) to auto-populate the gallery for an opening.
- **Top Curated Tab**: Sort videos/studies by "Community Performance" first.
- **Supabase Integration**: Persistence for votes/suggestions in a globally accessible, free-tier database.

### Feasibility: Medium
- Supabase is efficient for this scale of "Community Logic."
- Requires a new `/api/community` endpoint to manage permissions and rate-limiting.

### Desirability: Medium-High
- **Why us?** Lichess has $1M+$ studies; YouTube has $100k+$ chess videos. We provide a **"Curated Filter"** where the most helpful teaching aids rise to the top for each specific opening.

### MoSCoW: Could Have
- Great for growth but secondary to the core theoretical content.

## 3. Implementation Plan
1. Set up a Supabase project and define `upvotes` and `suggestions` tables.
2. Create `packages/api/src/routes/community.ts` to handle votes and submissions.
3. Update `StudiesGallery.tsx` and `VideoGallery.tsx` with "Like" buttons.
4. Add a "Suggest Content" modal.

## 4. Key Files
- `packages/api/src/routes/community.ts`
- `packages/web/src/components/detail/StudiesGallery.tsx`
- `packages/web/src/components/detail/VideoGallery.tsx`
- `packages/web/src/components/detail/SuggestionForm.tsx`
