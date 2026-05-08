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
    expect(res.body.data).toHaveLength(2);
    const ids = res.body.data.map((f) => f.id).sort();
    expect(ids).toEqual(['french', 'sicilian']);
    for (const f of res.body.data) {
      expect(f).toHaveProperty('display_name');
      expect(f).toHaveProperty('slug');
      expect(f).toHaveProperty('eco_anchor');
      expect(f).toHaveProperty('opening_count');
      expect(typeof f.opening_count).toBe('number');
    }
  });

  test('records are sorted alphabetically by display_name', async () => {
    const res = await request(makeApp()).get('/api/families');
    const names = res.body.data.map((f) => f.display_name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
