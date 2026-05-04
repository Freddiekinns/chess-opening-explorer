'use strict';

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function matchOverride(rule, opening) {
  const m = rule.match || {};
  if (m.name && normalise(m.name) !== normalise(opening.name)) return false;
  if (m.eco && m.eco.toUpperCase() !== String(opening.eco || '').toUpperCase()) return false;
  if (m.name_prefix) {
    if (!normalise(opening.name).startsWith(normalise(m.name_prefix))) return false;
  }
  return Boolean(m.name || m.eco || m.name_prefix);
}

function createResolver(families, overrideFile) {
  const overrides = (overrideFile && overrideFile.overrides) || [];
  const familyIds = new Set(Object.keys(families));
  const displayNameToId = new Map();
  for (const id of familyIds) {
    displayNameToId.set(normalise(families[id].display_name), id);
  }

  return function resolve(opening) {
    for (const rule of overrides) {
      if (matchOverride(rule, opening)) {
        if (familyIds.has(rule.family_id)) return rule.family_id;
      }
    }
    const name = String(opening.name || '').trim();
    const colon = name.indexOf(':');
    if (colon === -1) {
      const hit = displayNameToId.get(normalise(name));
      if (hit) return hit;
    } else {
      const prefix = name.slice(0, colon);
      const hit = displayNameToId.get(normalise(prefix));
      if (hit) return hit;
    }
    return 'uncategorised';
  };
}

module.exports = { createResolver };
