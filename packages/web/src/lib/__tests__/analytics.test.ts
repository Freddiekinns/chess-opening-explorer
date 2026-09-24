import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
const capture = vi.fn();
vi.mock('posthog-js/dist/module.slim', () => ({ default: { init, capture } }));

async function loadAnalytics() {
  vi.resetModules();
  return import('../analytics');
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('getAnonId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates an id and keeps it stable across calls', async () => {
    const { getAnonId } = await loadAnalytics();
    const id = getAnonId();
    expect(id.length).toBeGreaterThan(7);
    expect(getAnonId()).toBe(id);
    expect(localStorage.getItem('openingbook:anon-id')).toBe(id);
  });
});

// jsdom serves this file from localhost: dev, tests and preview deployments
// must never reach PostHog.
describe('trackEvent off the production host', () => {
  beforeEach(() => {
    localStorage.clear();
    init.mockClear();
    capture.mockClear();
  });

  it('does not load or call PostHog', async () => {
    const { trackEvent, initAnalytics } = await loadAnalytics();
    initAnalytics();
    trackEvent('band_select', { band: '1400' });
    await flush();

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    const { trackEvent } = await loadAnalytics();
    expect(() => trackEvent('analyse_run')).not.toThrow();
  });
});
