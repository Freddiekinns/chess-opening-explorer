const request = require('supertest');
const path = require('path');
const fs = require('fs');

// We test the route handler in isolation by stubbing the families.json read.
const familiesFixture = {
  sicilian: {
    id: 'sicilian',
    display_name: 'Sicilian Defense',
    slug: 'sicilian-defense',
    eco_anchor: 'B20–B99',
    colour_for: 'black',
    short_description: '…',
    popular_variation_ecos: ['B90'],
  },
  french: {
    id: 'french',
    display_name: 'French Defense',
    slug: 'french-defense',
    eco_anchor: 'C00–C19',
    colour_for: 'black',
    short_description: '…',
    popular_variation_ecos: ['C11'],
  },
  // Intentionally omits popular_variation_ecos to exercise the `|| []` fallback.
  caro: {
    id: 'caro',
    display_name: 'Caro-Kann Defense',
    slug: 'caro-kann-defense',
    eco_anchor: 'B10–B19',
    colour_for: 'black',
    short_description: '…',
  },
};

jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    readFileSync: (p, enc) => {
      if (typeof p === 'string' && p.endsWith('families.json')) {
        return JSON.stringify(familiesFixture);
      }
      return real.readFileSync(p, enc);
    },
    existsSync: (p) => {
      if (typeof p === 'string' && p.endsWith('families.json')) return true;
      return real.existsSync(p);
    },
  };
});

const express = require('express');
const familiesRouter = require('../../packages/api/src/routes/families.routes');

function makeApp() {
  const app = express();
  app.use('/api/families', familiesRouter);
  return app;
}

describe('GET /api/families', () => {
  test('returns all families with opening_count placeholder', async () => {
    const res = await request(makeApp()).get('/api/families');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const ids = res.body.data.map((f) => f.id).sort();
    expect(ids).toEqual(['caro', 'french', 'sicilian']);
    for (const f of res.body.data) {
      expect(f).toHaveProperty('display_name');
      expect(f).toHaveProperty('slug');
      expect(f).toHaveProperty('eco_anchor');
      expect(f).toHaveProperty('opening_count');
      expect(typeof f.opening_count).toBe('number');
      expect(Array.isArray(f.popular_variation_ecos)).toBe(true);
    }
  });

  test('records are sorted alphabetically by display_name', async () => {
    const res = await request(makeApp()).get('/api/families');
    const names = res.body.data.map((f) => f.display_name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('GET /api/families error handling', () => {
  afterEach(() => {
    jest.dontMock('fs');
    jest.resetModules();
  });

  // When no families.json exists at any candidate path, resolveFamiliesPath
  // falls back to the first candidate, loadFamilies throws, and the route
  // surfaces a 500. Exercises the path-fallback, the not-found throw, and the
  // catch handler in one isolated module instance (fresh cache).
  test('returns 500 when families.json cannot be found', async () => {
    jest.resetModules();
    jest.doMock('fs', () => {
      const real = jest.requireActual('fs');
      return {
        ...real,
        existsSync: (p) =>
          typeof p === 'string' && p.endsWith('families.json') ? false : real.existsSync(p),
      };
    });

    const expressFresh = require('express');
    const router = require('../../packages/api/src/routes/families.routes');
    const app = expressFresh();
    app.use('/api/families', router);

    const res = await request(app).get('/api/families');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/families\.json not found/);
  });
});

describe('GET /api/families opening_count population', () => {
  afterEach(() => {
    jest.dontMock('fs');
    jest.dontMock('../../packages/api/src/services/eco-service');
    jest.resetModules();
  });

  // When eco-service is available, opening_count is derived from the live
  // opening set. Exercises the ECOService-as-constructor branch, the
  // getAllOpenings path, the family_id tally, and the non-zero count lookup.
  test('counts openings per family from eco-service', async () => {
    jest.resetModules();
    jest.doMock('fs', () => {
      const real = jest.requireActual('fs');
      return {
        ...real,
        readFileSync: (p, enc) =>
          typeof p === 'string' && p.endsWith('families.json')
            ? JSON.stringify(familiesFixture)
            : real.readFileSync(p, enc),
        existsSync: (p) =>
          typeof p === 'string' && p.endsWith('families.json') ? true : real.existsSync(p),
      };
    });
    jest.doMock('../../packages/api/src/services/eco-service', () => {
      return class ECOServiceStub {
        getAllOpenings() {
          return [
            { family_id: 'sicilian' },
            { family_id: 'sicilian' },
            { family_id: 'french' },
            { family_id: null },
            {},
          ];
        }
      };
    });

    const expressFresh = require('express');
    const router = require('../../packages/api/src/routes/families.routes');
    const app = expressFresh();
    app.use('/api/families', router);

    const res = await request(app).get('/api/families');
    expect(res.status).toBe(200);
    const counts = Object.fromEntries(res.body.data.map((f) => [f.id, f.opening_count]));
    expect(counts.sicilian).toBe(2);
    expect(counts.french).toBe(1);
  });

  // eco-service exported as a plain object without getAllOpenings: counts stay
  // empty (opening_count falls back to 0). Exercises the object branch of the
  // ECOService ternary and the getAllOpenings guard's false branch.
  test('falls back to zero counts when eco-service lacks getAllOpenings', async () => {
    jest.resetModules();
    jest.doMock('fs', () => {
      const real = jest.requireActual('fs');
      return {
        ...real,
        readFileSync: (p, enc) =>
          typeof p === 'string' && p.endsWith('families.json')
            ? JSON.stringify(familiesFixture)
            : real.readFileSync(p, enc),
        existsSync: (p) =>
          typeof p === 'string' && p.endsWith('families.json') ? true : real.existsSync(p),
      };
    });
    jest.doMock('../../packages/api/src/services/eco-service', () => ({ notTheRightShape: true }), {
      virtual: false,
    });

    const expressFresh = require('express');
    const router = require('../../packages/api/src/routes/families.routes');
    const app = expressFresh();
    app.use('/api/families', router);

    const res = await request(app).get('/api/families');
    expect(res.status).toBe(200);
    for (const f of res.body.data) {
      expect(f.opening_count).toBe(0);
    }
  });
});
