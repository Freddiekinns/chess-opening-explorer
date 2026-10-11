/**
 * What the middleware drew into #root before React took it over.
 *
 * `middleware.ts` pre-renders an opening's description, win rates and links
 * into #root, and createRoot discards them on the first render. Kept here so
 * the detail page can go on showing them until its own data arrives — the
 * crawler's rendered DOM is whatever is on screen when it stops waiting, and
 * "Loading opening..." alone reads as a soft 404.
 *
 * Only ever for the page it was drawn for: an SPA step to another opening has
 * no pre-render of its own.
 */

let captured: { path: string; html: string } | null = null;

/** Call once, before createRoot. */
export function capturePrerender(): void {
  const html = document.getElementById('root')?.innerHTML.trim();
  captured = html ? { path: window.location.pathname, html } : null;
}

export function prerenderFor(path: string): string | null {
  return captured?.path === path ? captured.html : null;
}
