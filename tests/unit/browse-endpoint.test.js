const request = require('supertest');
const express = require('express');

const BROWSE_RESULT = {
  items: [{ fen: 'fen-1', name: 'Alpha', eco: 'A01' }],
  total: 3,
  page: 1,
  pageSize: 24,
  offset: 0,
  remaining: 2,
  facets: { level: [], style: [], family: [] },
  applied: { level: null, style: null, family: null, sort: 'popular' },
};

const mockBrowse = jest.fn(() => BROWSE_RESULT);

jest.mock('../../packages/api/src/services/browse-service', () =>
  jest.fn().mockImplementation(() => ({
    browse: mockBrowse,
    getConfig: () => ({
      pageSize: { default: 24, max: 48 },
      levels: [{ value: 'Beginner', label: 'Beginner' }],
      gambitOverride: { value: 'gambit', label: 'Gambit', tags: [] },
      styles: [{ value: 'aggressive', label: 'Aggressive', tags: [] }],
      sorts: [
        { value: 'popular', label: 'Most played' },
        { value: 'name', label: 'A–Z' },
      ],
      defaultSort: 'popular',
    }),
    familyIds: () => new Set(['sicilian', 'london']),
  }))
);

function buildApp() {
  const routes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/openings', routes);
  return app;
}

describe('GET /api/openings/browse', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('returns the contract shape with success at the top level', async () => {
    const res = await request(app).get('/api/openings/browse');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      total: 3,
      remaining: 2,
      items: expect.any(Array),
      facets: expect.any(Object),
      applied: expect.any(Object),
    });
    // Not nested under `data` — Phase 3 reads res.items directly.
    expect(res.body.data).toBeUndefined();
  });

  test('passes filters through to the service', async () => {
    await request(app).get(
      '/api/openings/browse?level=Beginner&style=aggressive&family=sicilian&sort=name&page=2&pageSize=12'
    );
    expect(mockBrowse).toHaveBeenCalledWith({
      level: 'Beginner',
      style: 'aggressive',
      family: 'sicilian',
      sort: 'name',
      page: '2',
      pageSize: '12',
    });
  });

  test('an unknown level is a 400, not a silent empty result', async () => {
    const res = await request(app).get('/api/openings/browse?level=Expert');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/level/i);
    expect(mockBrowse).not.toHaveBeenCalled();
  });

  test('an unknown style is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?style=banana');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/style/i);
  });

  test('an unknown family is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?family=nonesuch');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/family/i);
  });

  test('an unknown sort is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?sort=random');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort/i);
  });

  test('empty params are ignored rather than rejected', async () => {
    const res = await request(app).get('/api/openings/browse?level=&style=&family=');
    expect(res.status).toBe(200);
  });

  test('a service failure is a 500 with no stack in the body', async () => {
    mockBrowse.mockImplementationOnce(() => {
      throw new Error('index blew up');
    });
    const res = await request(app).get('/api/openings/browse');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.stack).toBeUndefined();
  });
});
