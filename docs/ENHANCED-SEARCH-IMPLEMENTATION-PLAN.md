# Implementation Plan: Enhanced Chess Opening Search

This document outlines the technical implementation plan for the Enhanced Search feature, as defined in `PRD-Enhanced-Search.md`. It incorporates advanced search logic for handling moves and multi-term queries like "attacking sicilian".

---

## **Part 1: Backend Implementation (`packages/api`)**

The backend will be responsible for indexing all opening data and providing a powerful, performant search API.

### **Step 1: Data Aggregation & Caching Service**

To ensure high performance, all opening data will be loaded and cached in memory on server startup.

*   **File to Create:** `packages/api/src/services/opening-data-service.js`
*   **Functionality:**
    *   On server startup, this service will read all `*.json` files from the `data/eco/` directory.
    *   It will aggregate the data from these files into a single, in-memory array of ~25,000 `Opening` objects.
    *   This service will expose a singleton function, e.g., `getOpenings()`, to provide the complete, cached dataset to other services, eliminating file I/O on a per-request basis.

### **Step 2: Core Search Service with Advanced Logic**

This service will contain the primary search logic, including fuzzy matching and multi-pass filtering.

*   **File to Create:** `packages/api/src/services/search-service.js`
*   **Dependencies:** Add `fuse.js` to `packages/api/package.json`.
*   **Functionality:**
    1.  **Initialization:** On startup, it will get the opening data from `opening-data-service` and initialize a `Fuse.js` index.
    2.  **Advanced `searchConfig`:** The Fuse index will be configured to search across multiple fields, including `moves`, with carefully tuned weights to prioritize matches.
        ```javascript
        const searchConfig = {
          keys: [
            { name: 'name', weight: 0.4 },
            { name: 'moves', weight: 0.3 },
            { name: 'analysis_json.style_tags', weight: 0.2 },
            { name: 'analysis_json.description', weight: 0.15 },
            { name: 'eco', weight: 0.1 }
          ],
          threshold: 0.4,
          includeScore: true,
          minMatchCharLength: 2
        };
        ```
    3.  **`enhancedSearch` Function:** This will be the core function, implementing a multi-pass strategy:
        *   **Input:** `(query: string, filters: { categories: string[] })`
        *   **Pass 1: Category Filtering:** If category filters are provided, it will first narrow down the dataset to only openings matching those categories.
        *   **Pass 2: Fuzzy Search:** It will run a `fuse.search()` on the (potentially filtered) dataset with the user's query. This provides a broad set of relevant results.
        *   **Pass 3: Adjective-Based Re-ranking:** For combined queries like "attacking sicilian," it will identify descriptive terms (e.g., "attacking", "solid") in the query. It will then iterate through the fuzzy search results and boost the score of any opening whose `style_tags` match these adjectives. This ensures the most relevant results rise to the top.

### **Step 3: New API Endpoint**

A new endpoint will expose the search service to the frontend.

*   **File to Modify:** `packages/api/src/routes/openings.js`
*   **New Route:** `GET /api/v1/openings/search`
*   **Query Parameters:**
    *   `q` (string): The user's text query.
    *   `categories` (string, comma-separated): Optional category IDs to pre-filter the search.
*   **Controller Logic:** The route handler will parse the query parameters, call the `search-service.enhancedSearch()` function, and return the final ranked and scored list of openings as JSON.

### **Step 4: TDD - Testing Strategy**

*   **Unit Tests (`tests/unit/`):**
    *   `opening-data-service.test.js`: Verify that all data is loaded and aggregated correctly.
    *   `search-service.test.js`:
        *   Test category filtering logic.
        *   Test fuzzy search for typos.
        *   Test that searching for moves (e.g., "d4") returns correct results.
        *   Test the multi-pass re-ranking logic for a query like "attacking sicilian".
*   **Integration Tests (`tests/integration/`):**
    *   Add tests for the `GET /api/v1/openings/search` endpoint to ensure the entire flow works correctly with various query combinations.

---

## **Part 2: Frontend Implementation (`packages/web`)**

The frontend will provide the user interface for the new search and discovery features.

### **Step 1: New Search Components**

*   **`components/search/EnhancedSearchBar.tsx`**: A new component containing the main text input. It will manage its own state and debounce user input before triggering an API call.
*   **`components/search/CategoryFilters.tsx`**: A component to display the clickable category pills (e.g., "⚔️ Attacking", "👶 Beginner"). It will manage the state of selected categories.
*   **`components/search/SearchResultsList.tsx`**: A component to render the list of search results.
*   **`components/search/SearchResultCard.tsx`**: An enhanced version of the opening card, designed to display tags, match score, and other relevant information from the API response.

### **Step 2: State Management**

A centralized state management solution (e.g., Zustand, Redux, or React Context) will be used to handle the search state across components.

*   **State to Manage:**
    *   `searchQuery` (string)
    *   `selectedCategories` (string[])
    *   `searchResults` (Opening[])
    *   `isLoading` (boolean)
    *   `error` (string | null)

### **Step 3: API Integration**

*   **File to Create:** `packages/web/src/services/api-client.js` or similar.
*   **Functionality:** A dedicated function, `fetchEnhancedSearchResults(query, categories)`, will be created to handle the API call to the new backend endpoint. It will construct the correct URL with query parameters and handle the response.

### **Step 4: Tying It All Together**

*   A new page or an update to an existing page (like `LandingPage.tsx`) will host the new search components.
*   The main search component will orchestrate the flow:
    1.  User types in the `EnhancedSearchBar` or clicks a `CategoryFilter`.
    2.  The component updates the central search state.
    3.  A `useEffect` hook, watching for changes in `searchQuery` or `selectedCategories`, will trigger the debounced API call.
    4.  While the API call is in progress, a loading state will be displayed.
    5.  Once the data is returned, it will be stored in the `searchResults` state, and the `SearchResultsList` will re-render with the new results.
