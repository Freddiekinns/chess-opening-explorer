# TASK010: Local Repertoire & Saved Openings

## Overview

As a user, I want to save chess openings to a personal repertoire without
creating an account. This feature will use browser-based storage (LocalStorage)
to persist a list of "starred" openings, allowing users to quickly return to
their favorite lines and build a practice list.

## User Stories

- **Save Opening**: As a user, I can click a "Star" or "Save" button on an
  opening detail page to add it to my repertoire.
- **View Repertoire**: As a user, I can see a list of my saved openings on the
  home page or a dedicated "My Repertoire" section.
- **Remove Opening**: As a user, I can "unstar" an opening to remove it from my
  repertoire.
- **Sync Status**: As a user, I can see if an opening is already saved when
  browsing many openings (e.g., a star icon on the search cards).
- **Color Grouping (Phase 2)**: As a user, I can tag saved openings as 'For
  White' or 'For Black' to meaningfully organize my repertoire.

## Technical Requirements

- **Storage Strategy**: Use `localStorage` to store your repertoire data. _Note:
  Consider storing lightweight objects (e.g. `{ id, name, eco }`) instead of
  just IDs during implementation planning to prevent expensive data lookups on
  the landing page._
- **Persistence**: Repertoire should persist across browser sessions on the same
  device.
- **Component Changes**:
  - `OpeningDetail`: Add a toggle button for saving/unsaving.
  - `OpeningCard`: (Optional) Add a small star indicator if the opening is in
    the repertoire.
  - `LandingPage`: Add a "My Repertoire" section that renders if there are saved
    items.
- **State Management**: Use a custom hook (e.g., `useRepertoire`) to manage the
  list and provide helper methods (`isSaved`, `toggleSave`).
- **Syncing**: Ensure state is synced across different tabs/windows using the
  `storage` event listener.

## Design Considerations

- **Iconography**: Use a Star (filled/outline) or Bookmark icon.
- **Feedback**: Provide a brief toast or visual feedback when an opening is
  saved.
- **Empty State**: Show a helpful message in the "My Repertoire" section when
  it's empty, encouraging users to browse and save openings.
- **Scalability (Many vs. Few)**: Have a clear view of how to handle scaling.
  For a 'few' scenario (e.g. < 5-10), a simple list works. For 'many' items,
  consider a horizontal scrolling section on the landing page or a dedicated
  'View All' page to avoid infinite scrolling.

## Future Considerations

- **Export/Import Repertoire**: Since there is no backend or user account,
  consider allowing users to export their repertoire as a copyable string and
  import it so they can move their configurations across browsers or devices.

## Success Criteria

- [x] Users can save an opening from the detail page.
- [x] Saved openings are visible in a new section on the landing page.
- [x] The repertoire persists after a page refresh.
- [x] Users can remove openings from their repertoire.
- [x] Zero dependency on backend/accounts.

## Implementation (2026-03-13)

**Branch:** `feature/local-repertoire`

### New Files

| File                                                               | Purpose                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `packages/web/src/hooks/useRepertoire.ts`                          | Hook: localStorage read/write, cross-tab sync, toggle/remove/isSaved API |
| `packages/web/src/hooks/__tests__/useRepertoire.test.ts`           | 12 tests covering CRUD, sync behavior, corrupted data, and write safety  |
| `packages/web/src/components/shared/StarButton.tsx`                | Presentational star toggle with CSS pulse animation                      |
| `packages/web/src/components/shared/StarButton.module.css`         | Star styles: filled/outline states, hover, animation keyframes           |
| `packages/web/src/components/landing/RepertoireSection.tsx`        | "My Repertoire" section: compact cards, empty state, horizontal scroller |
| `packages/web/src/components/landing/RepertoireSection.module.css` | Repertoire layout: responsive cards, scroller, empty state               |

### Modified Files

| File                                                  | Change                                                   |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `packages/web/src/pages/OpeningDetailPage.tsx`        | Star inline with h1 title via useRepertoire + StarButton |
| `packages/web/src/pages/OpeningDetailPage.module.css` | `.titleWithStar` flex layout, margin fix                 |
| `packages/web/src/components/shared/OpeningCard.tsx`  | Optional `showStar`/`isStarred`/`onStarClick` props      |
| `packages/web/src/pages/LandingPage.tsx`              | RepertoireSection between hero and popular grid          |

### Design Decisions

- **Hook-only (no Context)**: `useRepertoire` now uses a shared external-store
  pattern backed by `useSyncExternalStore`, so multiple consumers stay synced in
  the same tab while still responding to cross-tab `storage` events.
- **Compact repertoire cards**: Custom lightweight cards (ECO + complexity
  badge, 2-line clamped name, monospace moves) instead of full OpeningCard —
  better information density for quick-access section.
- **Responsive card sizing**: Cards use `flex: 1 0 200px; max-width: 300px` to
  fill available width, scrolling only when needed.
- **Baseline star alignment**: Star uses `align-items: baseline` with h1 for
  optical alignment with large display text.

### Validation

- 147/147 frontend tests passing (12 hook tests)
- TypeScript compiles cleanly (no source errors)
- Prettier formatted

### Bug Review Follow-up (2026-03-13)

- **Same-Tab State Synchronization**: Fixed. `useRepertoire` now uses a shared
  external-store pattern so multiple hook instances in the same tab update
  immediately after a save/remove, without waiting for a refresh or a cross-tab
  `storage` event.
- **Unhandled `localStorage` Exceptions**: Fixed. Storage writes are wrapped
  safely, and failed writes leave the hook state unchanged instead of throwing
  through the React tree.
- **Regression coverage**: Added targeted tests for same-tab synchronization and
  storage write failures. `src/hooks/__tests__/useRepertoire.test.ts` now has 12
  passing tests.

## Timeline

- **Phase 1 (Done)**: Core logic (hook) and toggle on Detail page.
- **Phase 2 (Done)**: "My Repertoire" section on Landing page.
- **Phase 3 (Done)**: Star indicators on cards.
- **Phase 4 (Partial)**: Animation on star toggle (done), toasts deferred.
- **Future**: Color grouping (White/Black), export/import.
