#!/usr/bin/env node

const ECOService = require('./src/services/eco-service');

async function downloadECOData() {
  console.log('Starting ECO data download...');
  
  try {
    const ecoService = new ECOService();
    await ecoService.downloadAllECOFiles();
    console.log('✅ ECO data downloaded successfully!');
    
    // Test loading the data
    const data = ecoService.loadECOData();
    console.log(`📊 Loaded ${Object.keys(data).length} opening positions`);
    
  } catch (error) {
    console.error('❌ Error downloading ECO data:', error);
    process.exit(1);
  }
}

downloadECOData();
