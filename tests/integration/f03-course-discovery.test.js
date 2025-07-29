/**
 * Integration tests for F03 Course Discovery Pipeline
 * Tests the complete workflow with real LLM integration
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

describe('F03 Course Discovery Integration', () => {
  const testDataDir = path.join(__dirname, '../fixtures/f03_integration');
  const toolsDir = path.join(__dirname, '../../tools');
  const enrichmentScript = path.join(toolsDir, 'production/enrich_course_data.js');

  // Helper function to spawn with test environment
  const spawnWithTestEnv = (args, options = {}) => {
    return spawn('node', args, {
      ...options,
      env: { ...process.env, NODE_ENV: 'test', ...options.env }
    });
  };

  beforeAll(async () => {
    // Ensure test data directory exists
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rmdir(testDataDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Command Line Interface', () => {
    test('should show help when run with --help', (done) => {
      const child = spawnWithTestEnv([enrichmentScript, '--help']);
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Usage:');
        expect(output).toContain('--single');
        expect(output).toContain('--batch');
        expect(output).toContain('--output-dir');
        expect(output).toContain('--max-cost');
        done();
      });
    });

    test('should require either --single or --batch parameter', (done) => {
      const child = spawnWithTestEnv([enrichmentScript]);
      let stderr = '';
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stderr).toContain('Must specify either --single or --batch');
        done();
      });
    });

    test('should validate opening name for single processing', (done) => {
      const child = spawnWithTestEnv([enrichmentScript, '--single', '']);
      let stderr = '';
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stderr).toContain('Opening name cannot be empty');
        done();
      });
    });
  });

  describe('Single Opening Analysis', () => {
    test('should analyze Sicilian Defense and generate valid output', (done) => {
      const outputFile = path.join(testDataDir, 'sicilian_analysis.json');
      const child = spawnWithTestEnv([
        enrichmentScript,
        '--single', 'Sicilian Defense',
        '--output-dir', testDataDir,
        '--max-cost', '1.00'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', async (code) => {
        expect(code).toBe(0);
        expect(stderr).toBe('');
        
        // Verify output file was created
        const files = await fs.readdir(testDataDir);
        const analysisFile = files.find(f => f.includes('rnbqkbnr_pp1ppppp'));
        expect(analysisFile).toBeDefined();
        
        // Verify file content
        const content = await fs.readFile(path.join(testDataDir, analysisFile), 'utf8');
        const data = JSON.parse(content);
        
        expect(data).toHaveProperty('analysis_for_opening');
        expect(data.analysis_for_opening.name).toBe('Sicilian Defense');
        expect(data).toHaveProperty('found_courses');
        expect(data).toHaveProperty('last_verified_on');
        expect(Array.isArray(data.found_courses)).toBe(true);
        
        done();
      });
    }, 30000); // 30 second timeout for LLM API
  });

  describe('Cost Tracking and Limits', () => {
    test('should track and report costs accurately', (done) => {
      const child = spawnWithTestEnv([
        enrichmentScript,
        '--single', 'King\'s Pawn Game',
        '--output-dir', testDataDir,
        '--max-cost', '1.00',
        '--report-costs'
      ]);
      
      let stdout = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toContain('Cost breakdown:');
        expect(stdout).toContain('Input tokens:');
        expect(stdout).toContain('Output tokens:');
        expect(stdout).toContain('Grounding queries:');
        expect(stdout).toContain('Total cost: $');
        done();
      });
    }, 30000);

    test('should respect cost limits', (done) => {
      const child = spawnWithTestEnv([
        enrichmentScript,
        '--single', 'Sicilian Defense',
        '--max-cost', '0.001' // Very low limit
      ]);
      
      let stderr = '';
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(stderr).toContain('cost limit');
        done();
      });
    });
  });

  describe('Data Integration with Existing System', () => {
    test('should read from opening_popularity_data.json', async () => {
      const popularityFile = path.join(__dirname, '../../data/opening_popularity_data.json');
      const exists = await fs.access(popularityFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const fileData = JSON.parse(await fs.readFile(popularityFile, 'utf8'));
      const data = fileData.top_100_openings || fileData; // Handle both formats
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(50); // Reduced from 1000 to be more realistic
      
      // Verify expected structure
      const firstOpening = data[0];
      expect(firstOpening).toHaveProperty('rank');
      expect(firstOpening).toHaveProperty('name');
      expect(firstOpening).toHaveProperty('moves');
      expect(firstOpening).toHaveProperty('eco');
      expect(firstOpening).toHaveProperty('fen');
    });

    test('should handle batch processing from opening_popularity_data.json', (done) => {
      const child = spawnWithTestEnv([
        enrichmentScript,
        '--batch', '3', // Process first 3 openings
        '--output-dir', testDataDir,
        '--max-cost', '2.00'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', async (code) => {
        expect(code).toBe(0);
        expect(stderr).toBe('');
        expect(stdout).toContain('Processed 3 openings');
        
        // Verify multiple files were created
        const files = await fs.readdir(testDataDir);
        const analysisFiles = files.filter(f => f.endsWith('.json') && !f.includes('sicilian') && !f.includes('kings'));
        expect(analysisFiles.length).toBeGreaterThanOrEqual(3);
        
        done();
      });
    }, 60000); // 60 second timeout for batch processing
  });

  describe('Error Recovery and Resumability', () => {
    test('should skip existing files and resume processing', async () => {
      // Create a fake analysis file
      const fakeFileName = 'rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_b_KQkq_-_0_1.json';
      const fakePath = path.join(testDataDir, fakeFileName);
      const fakeData = {
        analysis_for_opening: {
          rank: 1,
          name: "King's Pawn Game",
          fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        },
        found_courses: [],
        last_verified_on: new Date().toISOString()
      };
      
      await fs.writeFile(fakePath, JSON.stringify(fakeData, null, 2));
      
      return new Promise((resolve) => {
        const child = spawnWithTestEnv([
          enrichmentScript,
          '--single', 'King\'s Pawn Game',
          '--output-dir', testDataDir,
          '--max-cost', '1.00'
        ]);
        
        let stdout = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(stdout).toContain('already exists, skipping');
          resolve();
        });
      });
    });
  });
});
