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
  const root = document.getElementById('root');
  const html = root?.innerHTML.trim();
  // The middleware swaps index.html's spinner out; where it drew nothing (no
  // lookup entry, a failed shard, dev) the spinner is still there, and kept it
  // spun at full height under the error message.
  const drawn = html && !root?.querySelector('.loading-spinner');
  captured = drawn ? { path: window.location.pathname, html } : null;
}

export function prerenderFor(path: string): string | null {
  return captured?.path === path ? captured.html : null;
}
