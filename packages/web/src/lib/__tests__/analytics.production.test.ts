// @vitest-environment-options {"url": "https://openingbook.xyz/opening/abc"}
import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
const capture = vi.fn();
vi.mock('posthog-js/dist/module.slim', () => ({ default: { init, capture } }));

async function loadAnalytics() {
  vi.resetModules();
  return import('../analytics');
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('trackEvent on openingbook.xyz', () => {
  beforeEach(() => {
    localStorage.clear();
    init.mockReset();
    capture.mockReset();
  });

  it('initialises PostHog once, cookieless, under the anonymous id', async () => {
    const { trackEvent, getAnonId } = await loadAnalytics();
    trackEvent('analyse_run');
    trackEvent('band_select', { band: '1400' });
    await flush();

    expect(init).toHaveBeenCalledTimes(1);
    const [key, config] = init.mock.calls[0];
    expect(key).toMatch(/^phc_/);
    expect(config).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      persistence: 'localStorage',
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: 'history_change',
      bootstrap: { distinctID: getAnonId() },
    });
  });

  it('captures the event with its properties', async () => {
    const { trackEvent } = await loadAnalytics();
    trackEvent('band_select', { band: '1400' });
    await flush();

    expect(capture).toHaveBeenCalledWith('band_select', { band: '1400' });
  });

  it('initAnalytics starts PostHog without capturing anything', async () => {
    const { initAnalytics } = await loadAnalytics();
    initAnalytics();
    await flush();

    expect(init).toHaveBeenCalledTimes(1);
    expect(capture).not.toHaveBeenCalled();
  });

  it('swallows a PostHog failure', async () => {
    capture.mockImplementation(() => {
      throw new Error('blocked');
    });
    const { trackEvent } = await loadAnalytics();
    expect(() => trackEvent('video_click', { rank: 1 })).not.toThrow();
    await flush();
  });
});
