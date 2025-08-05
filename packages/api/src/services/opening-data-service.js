const fs = require('fs').promises;
const path = require('path');

const ecoDirectory = path.join(__dirname, '..', '..', '..', 'data', 'eco');

let openingsCache = null;

/**
 * Loads all opening data from the eco JSON files into a single array.
 * The data is cached in memory after the first load to ensure high performance.
 * @returns {Promise<object[]>} A promise that resolves to the array of opening objects.
 */
async function getOpenings() {
  if (openingsCache) {
    return openingsCache;
  }

  try {
    const files = await fs.readdir(ecoDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const allOpenings = [];

    for (const file of jsonFiles) {
      const filePath = path.join(ecoDirectory, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const openings = JSON.parse(fileContent);
      allOpenings.push(...openings);
    }

    console.log(`[OpeningDataService] Loaded and cached ${allOpenings.length} openings.`);
    openingsCache = allOpenings;
    return openingsCache;
  } catch (error) {
    console.error('[OpeningDataService] Error loading opening data:', error);
    throw new Error('Could not load opening data.');
  }
}

module.exports = {
  getOpenings,
};
