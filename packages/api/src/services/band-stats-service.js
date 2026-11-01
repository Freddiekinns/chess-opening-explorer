/**
 * Band Stats Service
 * Per-position game counts by Lichess rating band, from
 * api/data/popularity-bands.json (written by tools/analysis/combine_window.py).
 * Browse reads it to rank and report by a band. A band with too few games is
 * null in the file and stays null here, never zeroes.
 */

const fs = require('fs');
const pathResolver = require('../utils/path-resolver');

// The four Lichess bands, as in BAND_RATINGS in explorer.routes.js. Masters
// has no batch data, so it is not one.
const BANDS = ['u1400', '1400', '1800', '2200'];

let data = null;

function load() {
  if (data === null) {
    try {
      const file = pathResolver.getDataPath('popularity-bands.json');
      data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    } catch (error) {
      console.warn('Band stats unavailable:', error.message);
      data = {};
    }
  }
  return data;
}

function isBand(value) {
  return BANDS.includes(value);
}

/** @returns {{g: number, w: number, d: number, b: number} | null} */
function forFen(fen, band) {
  if (!isBand(band)) return null;
  const bands = (load().positions || {})[fen];
  return (bands && bands[band]) || null;
}

/** @returns {{since: string, until: string} | null} */
function window() {
  return load().window || null;
}

/** Test hook: clear the module-level cache. */
function resetCache() {
  data = null;
}

module.exports = { BANDS, isBand, forFen, window, resetCache };
