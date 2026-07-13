/**
 * /api/event beacon endpoint (deviation-trainer PRD §9) — counts only,
 * no PII, always no-store. The "store" is Vercel runtime logs: one
 * structured console line per valid event.
 */

const { Readable } = require('stream');
const handler = require('../../api/event');

function mockReq({ method = 'POST', body } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
  req.method = method;
  req.url = '/api/event';
  return req;
}

function mockRes() {
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end: jest.fn(),
  };
  return res;
}

describe('/api/event', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('rejects non-POST requests with 405', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('accepts a valid event with 204 and logs one structured line', async () => {
    const res = mockRes();
    const body = JSON.stringify({ event: 'band_select', page: '/opening/xyz', id: 'anon-1' });
    await handler(mockReq({ body }), res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logged).toMatchObject({
      type: 'event',
      event: 'band_select',
      page: '/opening/xyz',
      id: 'anon-1',
    });
  });

  it('still returns 204 but logs nothing for malformed or oversized events', async () => {
    const res1 = mockRes();
    await handler(mockReq({ body: 'not json' }), res1);
    expect(res1.statusCode).toBe(204);

    const res2 = mockRes();
    await handler(mockReq({ body: JSON.stringify({ event: 'x'.repeat(65) }) }), res2);
    expect(res2.statusCode).toBe(204);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('passes through short whitelisted extras only', async () => {
    const res = mockRes();
    const body = JSON.stringify({
      event: 'explorer_error',
      status: 429,
      band: '1400',
      secret: 'should-not-appear',
    });
    await handler(mockReq({ body }), res);
    const logged = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logged.status).toBe(429);
    expect(logged.band).toBe('1400');
    expect(logged.secret).toBeUndefined();
  });
});
