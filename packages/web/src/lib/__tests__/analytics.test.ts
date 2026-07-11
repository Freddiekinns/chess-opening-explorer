import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAnonId, trackEvent } from '../analytics';

describe('getAnonId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates an id and keeps it stable across calls', () => {
    const id = getAnonId();
    expect(id.length).toBeGreaterThan(7);
    expect(getAnonId()).toBe(id);
    expect(localStorage.getItem('openingbook:anon-id')).toBe(id);
  });
});

describe('trackEvent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup of the jsdom navigator stub
    delete navigator.sendBeacon;
  });

  it('sends a beacon with event, page and anon id', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });

    trackEvent('band_select', { band: '1400' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, payload] = sendBeacon.mock.calls[0];
    expect(url).toBe('/api/event');
    const parsed = JSON.parse(payload as string);
    expect(parsed.event).toBe('band_select');
    expect(parsed.band).toBe('1400');
    expect(typeof parsed.page).toBe('string');
    expect(parsed.id).toBe(getAnonId());
  });

  it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    trackEvent('bridge_click');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/event');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
  });

  it('never throws even when both transports fail', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('offline');
      })
    );
    expect(() => trackEvent('level_check_view')).not.toThrow();
  });
});
