const DatabaseSchema = require('../database/schema-manager.js');
const LegacyDataIntegrator = require('../database/legacy-data-integrator.js');
const StaticFileGenerator = require('../database/static-file-generator.js');
const fs = require('fs');

async function runCompleteMigration() {
  console.log('🚀 Starting Complete Legacy Data Migration with FEN-based Openings');
  console.log('====================================================================');
  
  try {
    // Step 1: Create Database Schema
    console.log('\n📊 Step 1: Creating Database Schema...');
    const dbSchema = new DatabaseSchema('data/videos.sqlite');
    await dbSchema.initializeSchema();
    console.log('✅ Database schema created');
    
    // Step 2: Populate Openings from ECO files (FEN-based)
    console.log('\n📚 Step 2: Populating Openings from ECO files...');
    let totalOpenings = 0;
    
    for (const ecoFile of ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json']) {
      console.log(`   Processing ${ecoFile}...`);
      const ecoPath = `data/eco/${ecoFile}`;
      
      if (fs.existsSync(ecoPath)) {
        const ecoData = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
        
        for (const [fen, opening] of Object.entries(ecoData)) {
          await dbSchema.insertOpening({
            fen: fen, // FEN as primary key (fixed field name)
            name: opening.name,
            eco: opening.eco,
            aliases: JSON.stringify(opening.aliases || [])
          });
          totalOpenings++;
        }
      }
    }
    console.log(`✅ Populated ${totalOpenings} openings`);
    
    // Step 3: Migrate Legacy Data
    console.log('\n📁 Step 3: Migrating Legacy Video Data...');
    const integrator = new LegacyDataIntegrator('data/videos.sqlite');
    const result = await integrator.runCompleteIntegration();
    console.log('✅ Legacy data integrated:', result);
    
    // Step 4: Generate Static Files
    console.log('\n📄 Step 4: Generating Static API Files...');
    const staticGenerator = new StaticFileGenerator('data/videos.sqlite');
    const staticResult = await staticGenerator.generateAllStaticFiles();
    console.log('✅ Static files generated:', staticResult);
    
    // Step 5: Final Validation
    console.log('\n🔍 Step 5: Final Validation...');
    const stats = await dbSchema.getDatabaseStats();
    console.log('📊 Final Database Stats:', stats);
    
    const dbSize = fs.statSync('data/videos.sqlite').size;
    const originalSize = fs.statSync('data/video_enrichment_cache.json').size;
    const reduction = ((1 - dbSize/originalSize) * 100).toFixed(1);
    
    console.log(`💾 Storage Reduction: ${(originalSize/1024/1024).toFixed(2)}MB → ${(dbSize/1024/1024).toFixed(2)}MB (${reduction}% reduction)`);
    
    await dbSchema.close();
    console.log('\n🎉 MIGRATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

runCompleteMigration();
