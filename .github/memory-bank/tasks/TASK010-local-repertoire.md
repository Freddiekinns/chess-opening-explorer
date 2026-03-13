# TASK010: Local Repertoire & Saved Openings

## Overview
As a user, I want to save chess openings to a personal repertoire without creating an account. This feature will use browser-based storage (LocalStorage) to persist a list of "starred" openings, allowing users to quickly return to their favorite lines and build a practice list.

## User Stories
- **Save Opening**: As a user, I can click a "Star" or "Save" button on an opening detail page to add it to my repertoire.
- **View Repertoire**: As a user, I can see a list of my saved openings on the home page or a dedicated "My Repertoire" section.
- **Remove Opening**: As a user, I can "unstar" an opening to remove it from my repertoire.
- **Sync Status**: As a user, I can see if an opening is already saved when browsing many openings (e.g., a star icon on the search cards).
- **Color Grouping (Phase 2)**: As a user, I can tag saved openings as 'For White' or 'For Black' to meaningfully organize my repertoire.

## Technical Requirements
- **Storage Strategy**: Use `localStorage` to store your repertoire data. *Note: Consider storing lightweight objects (e.g. `{ id, name, eco }`) instead of just IDs during implementation planning to prevent expensive data lookups on the landing page.*
- **Persistence**: Repertoire should persist across browser sessions on the same device.
- **Component Changes**:
  - `OpeningDetail`: Add a toggle button for saving/unsaving.
  - `OpeningCard`: (Optional) Add a small star indicator if the opening is in the repertoire.
  - `LandingPage`: Add a "My Repertoire" section that renders if there are saved items.
- **State Management**: Use a custom hook (e.g., `useRepertoire`) to manage the list and provide helper methods (`isSaved`, `toggleSave`).
- **Syncing**: Ensure state is synced across different tabs/windows using the `storage` event listener.

## Design Considerations
- **Iconography**: Use a Star (filled/outline) or Bookmark icon.
- **Feedback**: Provide a brief toast or visual feedback when an opening is saved.
- **Empty State**: Show a helpful message in the "My Repertoire" section when it's empty, encouraging users to browse and save openings.
- **Scalability (Many vs. Few)**: Have a clear view of how to handle scaling. For a 'few' scenario (e.g. < 5-10), a simple list works. For 'many' items, consider a horizontal scrolling section on the landing page or a dedicated 'View All' page to avoid infinite scrolling.

## Future Considerations
- **Export/Import Repertoire**: Since there is no backend or user account, consider allowing users to export their repertoire as a copyable string and import it so they can move their configurations across browsers or devices.

## Success Criteria
- [ ] Users can save an opening from the detail page.
- [ ] Saved openings are visible in a new section on the landing page.
- [ ] The repertoire persists after a page refresh.
- [ ] Users can remove openings from their repertoire.
- [ ] Zero dependancy on backend/accounts.

## Timeline
- **Phase 1**: Core logic (hook) and toggle on Detail page.
- **Phase 2**: "My Repertoire" section on Landing page.
- **Phase 3**: Star indicators on search results/cards.
- **Phase 4**: Polish (animations, toasts).
