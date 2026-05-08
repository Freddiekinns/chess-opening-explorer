'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Source of truth: repo-root data/families.json (committed). Avoid the
// dual-path dance documented in CLAUDE.md (video-index gotcha) — read directly
// from data/ rather than relying on prepare-vercel-data.js to copy it.
const FAMILIES_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'families.json'
);

let cache = null;
let cacheTime = 0;
const TTL_MS = 60 * 60 * 1000;

function loadFamilies() {
  if (!fs.existsSync(FAMILIES_PATH)) {
    throw new Error(`families.json not found at ${FAMILIES_PATH}`);
  }
  return JSON.parse(fs.readFileSync(FAMILIES_PATH, 'utf8'));
}

function buildResponse() {
  const now = Date.now();
  if (cache && now - cacheTime < TTL_MS) return cache;

  const families = loadFamilies();

  // opening_count is 0 by default; populated lazily if eco-service is available.
  let counts = {};
  try {
    const ECOService = require('../services/eco-service');
    const ecoService =
      typeof ECOService === 'function' ? new ECOService() : ECOService;
    const all =
      ecoService && typeof ecoService.getAllOpenings === 'function'
        ? ecoService.getAllOpenings()
        : [];
    for (const o of all) {
      if (o.family_id) counts[o.family_id] = (counts[o.family_id] || 0) + 1;
    }
  } catch (_) {
    // eco-service may be unavailable in test contexts
  }

  const data = Object.values(families)
    .map((f) => ({
      id: f.id,
      display_name: f.display_name,
      slug: f.slug,
      eco_anchor: f.eco_anchor,
      colour_for: f.colour_for,
      short_description: f.short_description,
      popular_variation_ecos: f.popular_variation_ecos || [],
      opening_count: counts[f.id] || 0,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  cache = { success: true, data, count: data.length };
  cacheTime = now;
  return cache;
}

router.get('/', (req, res) => {
  try {
    res.json(buildResponse());
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
