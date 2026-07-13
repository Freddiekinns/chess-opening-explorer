/**
 * Fire-and-forget instrumentation (deviation-trainer PRD §9).
 *
 * Events go to /api/event via sendBeacon (fetch keepalive fallback) with an
 * anonymous random id — no PII, per-device, clearable with site data. Also
 * carries `explorer_error` events, the S4-lite failure visibility for the
 * Lichess explorer integration. Never throws; losing an event is fine.
 */

const ANON_ID_KEY = 'openingbook:anon-id';
const ENDPOINT = '/api/event';

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the weak fallback
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return 'no-storage';
  }
}

export function trackEvent(event: string, data?: Record<string, string | number>): void {
  try {
    const payload = JSON.stringify({
      event,
      page: typeof location !== 'undefined' ? location.pathname : '',
      id: getAnonId(),
      ...data,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, payload);
      return;
    }
    if (typeof fetch === 'function') {
      // text/plain body avoids a CORS-style preflight, matching sendBeacon.
      void fetch(ENDPOINT, { method: 'POST', keepalive: true, body: payload }).catch(() => {});
    }
  } catch {
    // Instrumentation must never break the page.
  }
}
