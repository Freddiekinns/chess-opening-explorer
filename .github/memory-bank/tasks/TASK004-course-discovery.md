# [TASK004] - Course Discovery & Workflow

**Status:** Pending  
**Added:** 2026-02-10  
**Updated:** 2026-02-10

## Original Request

Gather course data and create a courses flow.

- Use scraping for Lichess studies (free and accessible) with rate-limiting to prevent timeouts.
- Provide a link that generates a search query on Chessable (instead of scraping) to send users there with pre-populated search.

## User Stories

- **As a learner**, I want to see curated materials for the opening I'm studying so I can deepen my theoretical knowledge.
- **As a user**, I want the study materials to be high-quality and free whenever possible.
- **As a user**, I want a quick way to search professional platforms like Chessable without re-typing opening names.

## User Journey

1. **Discovery**: User is on the "Opening Detail" page for the "French Defense: Winawer Variation".
2. **Navigation**: User clicks on a new "Courses" tab.
3. **Interaction**: User sees a list of Lichess studies (title, author, link) and a "Search for more on Chessable" button.
4. **Action**: User clicks a Lichess study link to open it in a new tab, OR clicks the Chessable button which opens a pre-populated search for "French Defense Winawer" on Chessable.

## Proposed Logic

1. **Discovery Engine**: A script that iterates through openings in the database.
2. **Lichess Integration**: Scrape `lichess.org/study/search?q=[query]` slowly to avoid rate limits.
3. **Chessable Integration**: Generate search URLs like `https://www.chessable.com/courses/all/s/?search=[query]` for use in the UI.
4. **Data Storage**: Update `packages/api/src/data/courses.json` with gathered metadata.
5. **UI Flow**: Add a "Courses" tab to the Opening Detail page to display these recommendations.

## Progress Tracking

**Overall Status:** 0% Complete

| Area                            | Status  | Notes                                    |
| ------------------------------- | ------- | ---------------------------------------- |
| Discovery Script (Scraper)      | Pending | Needs implementation with rate-limiting  |
| Lichess Mapping                 | Pending | Extract Title, Author, Link              |
| Chessable Search Link Generator | Pending | UI utility function                      |
| UI: Courses Tab                 | Pending | Integration into `OpeningDetailPage.tsx` |
| Infrastructure: Courses API     | Pending | Backend already has base service         |

## Deferred / Future Ideas

| Idea                          | Rationale                                  |
| ----------------------------- | ------------------------------------------ |
| Official Lichess Study API    | Use if keyword search is ever added to API |
| Automated Author Verification | Verify "Master" or "Reputable" authors     |

## Acceptance Criteria

1. Script successfully finds Lichess studies for major openings.
2. `courses.json` is populated with valid links.
3. UI displays course cards on the Opening Detail page.
4. Chessable "Search More" link works correctly with the current opening name.

## Key Files

- `tools/course-discovery/discover.js` (to be created)
- `packages/api/src/services/course-service.js`
- `packages/api/src/data/courses.json`
- `packages/web/src/pages/OpeningDetailPage.tsx`
