/**
 * Behavioural analytics: PostHog (EU cloud, free tier).
 *
 * Vercel Web Analytics already counts page views, but custom events are
 * Pro-only on Vercel, and the `/api/event` beacons this replaced landed in
 * runtime logs that Hobby keeps for one hour. PostHog keeps them, and gives us
 * funnels and retention per anonymous id.
 *
 * Cookieless: PostHog persists to localStorage under our own anonymous random
 * id — no PII, per-device, clearable with site data. Autocapture and session
 * replay are off; only the named `trackEvent` calls are sent, including the
 * `$pageview` App reports on each route change.
 * The SDK is loaded lazily and only on the production host, so dev, tests and
 * preview deployments never send anything. Never throws; losing an event is
 * fine.
 */

import type { PostHog } from 'posthog-js/dist/module.slim';

const ANON_ID_KEY = 'openingbook:anon-id';
const PRODUCTION_HOST = 'openingbook.xyz';
// Project token: write-only and meant to ship in client code.
const POSTHOG_KEY = 'phc_mgukGJQpEVS56H4JDUd6qYvpPSFRSaCjQpa8kkn8ppgo';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

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

let client: Promise<PostHog | null> | null = null;

function loadPostHog(): Promise<PostHog | null> {
  if (!client) {
    client =
      typeof location === 'undefined' || location.hostname !== PRODUCTION_HOST
        ? Promise.resolve(null)
        : import('posthog-js/dist/module.slim')
            .then(({ default: posthog }) => {
              posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                persistence: 'localStorage',
                autocapture: false,
                disable_session_recording: true,
                // The slim build has no history autocapture, so it would see
                // only the first page of a visit; App reports page views.
                capture_pageview: false,
                bootstrap: { distinctID: getAnonId() },
              });
              return posthog;
            })
            .catch(() => null);
  }
  return client;
}

export function trackEvent(event: string, data?: Record<string, string | number>): void {
  try {
    // Read now: callers often navigate straight after tracking, and PostHog is
    // reached a microtask later, when the URL is already the next page's.
    const properties = { $current_url: location.href, ...data };
    void loadPostHog()
      .then((posthog) => posthog?.capture(event, properties))
      .catch(() => {});
  } catch {
    // Instrumentation must never break the page.
  }
}
