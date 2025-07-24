/**
 * Test for the enrichment pipeline script
 */

const { spawn } = require('child_process');
const path = require('path');

describe('Enrichment Pipeline Script', () => {
  test('should show error when no credentials provided', (done) => {
    const scriptPath = path.join(__dirname, '../../../../tools/production/enrich_openings_llm.js');
    const child = spawn('node', [scriptPath, '--batchSize=5'], {
      env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS_JSON: '' }
    });

    let output = '';
    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(output).toContain('Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON');
      done();
    });
  }, 10000);

  test('should validate batch size parameter', (done) => {
    const scriptPath = path.join(__dirname, '../../../../tools/production/enrich_openings_llm.js');
    const child = spawn('node', [scriptPath, '--batchSize=1500'], {
      env: { ...process.env }
    });

    let output = '';
    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(output).toContain('Batch size must be between 1 and 1000');
      done();
    });
  }, 10000);

  test('should show help when --help flag is used', (done) => {
    const scriptPath = path.join(__dirname, '../../../../tools/production/enrich_openings_llm.js');
    const child = spawn('node', [scriptPath, '--help']);

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      expect(output).toContain('batchSize');
      expect(output).toContain('Number of openings to process in this batch');
      done();
    });
  }, 10000);
});
