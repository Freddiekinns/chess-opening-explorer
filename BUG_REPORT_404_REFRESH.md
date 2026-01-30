# Bug Report: Production 404 on Page Refresh

## Summary

When a user refreshes the page on any sub-route (e.g., `/opening/:fen`) on the production site (`openingbook.vercel.app`), they receive a 404 Not Found error from Vercel. This works correctly on `localhost` because the development server automatically handles SPA routing fallbacks.

## Details

- **Environment**: Production (`openingbook.vercel.app`)
- **Framework**: React (SPA) with `react-router-dom`
- **Infrastructure**: Vercel

## Steps to Reproduce

1. Navigate to `https://openingbook.vercel.app/`
2. Select an opening to go to a detail page (e.g., `/opening/r1bqkb1r...`)
3. Refresh the browser
4. **Result**: Vercel returns "404: NOT_FOUND"

## Analysis of Cause

The root cause is a common "SPA routing" issue.

1. **Client-side routing**: In an SPA, navigation within the app is handled by JavaScript (`react-router-dom`). It updates the URL in the browser without actually requesting a new page from the server.
2. **Server-side request**: When the user hits "refresh", the browser makes a direct GET request to the server for that specific path (e.g., `/opening/...`).
3. **Vercel behavior**: Vercel looks for a physical file at that path in the `public` or `dist` folder. Since it doesn't find one, and there is no "rewrite" rule in `vercel.json` telling it to serve `index.html` instead, it returns a 404.
4. **Localhost difference**: `npm run dev` (likely using Vite or similar) is configured to automatically serve `index.html` for any path that doesn't match a static file, which is why it works locally.

## Proposed Fix

We need to update `vercel.json` to include a catch-all rewrite rule. This rule should:

1. Allow `/api/*` requests to go to their respective handlers.
2. Allow physical files (JS, CSS, images) to be served normally.
3. Redirect all other requests to `/index.html`.

### Recommended `vercel.json` Change

Add a rewrite at the end of the `rewrites` array:

```json
{
  "source": "/((?!api/).*)",
  "destination": "/index.html"
}
```

Alternatively, using the `handle: filesystem` approach ensures that if a file exists, it's served, otherwise it falls back to `index.html`.
