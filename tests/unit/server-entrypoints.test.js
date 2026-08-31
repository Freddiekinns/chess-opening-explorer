/**
 * The two files that actually boot in production, loaded as production loads
 * them.
 *
 * Every other backend test builds its own `express()` and mounts a router, so
 * nothing in 1004 passing tests ever executes `packages/api/src/server.js` or
 * `api/index.js` — the files that carry the app-level middleware, the 404
 * handler and the error handler. A change that makes either refuse to
 * construct is therefore invisible to CI, and a Vercel build succeeds anyway
 * because a serverless function is only required on its first invocation.
 *
 * That is not hypothetical: `app.all('*')` is valid in Express 4 and throws
 * `Missing parameter name at index 1` under Express 5's path-to-regexp 8.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const API_DIR = path.join(__dirname, '..', '..', 'api');

// Nine Vercel functions, not one. Each builds its own app at module load, so
// requiring the file is the whole test: a route pattern the router refuses is
// thrown before any request arrives.
describe.each(fs.readdirSync(API_DIR).filter((f) => f.endsWith('.js')))('api/%s', (file) => {
  it('constructs when required', () => {
    const exported = require(path.join(API_DIR, file));

    expect(typeof exported).toBe('function');
  });
});

describe.each([
  ['packages/api/src/server.js', '../../packages/api/src/server', '/health'],
  ['api/index.js', '../../api/index', '/api/health'],
])('%s', (_label, modulePath, healthPath) => {
  let app;

  beforeAll(() => {
    app = require(modulePath);
  });

  it('constructs without throwing', () => {
    expect(typeof app).toBe('function');
  });

  it('answers its health route', async () => {
    const response = await request(app).get(healthPath);

    expect(response.status).toBe(200);
  });

  it('answers an unmatched route with the JSON 404, not a stack trace', async () => {
    const response = await request(app).get('/no-such-route');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'Not Found' });
  });
});
