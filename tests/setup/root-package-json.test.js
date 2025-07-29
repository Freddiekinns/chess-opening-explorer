/**
 * Root Package Json Setup Tests
 * 
 * Following TDD principles:
 * - Test behavior, not implementation
 * - Mock external dependencies  
 * - Fast, isolated tests
 */

const fs = require('fs');
const path = require('path');

describe('Root Package.json Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  test('should have package.json file at project root', () => {
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    expect(fs.statSync(packageJsonPath).isFile()).toBe(true);
  });

  test('should have valid JSON structure', () => {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('should have workspace configuration', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.workspaces).toBeDefined();
    expect(Array.isArray(packageJson.workspaces)).toBe(true);
    expect(packageJson.workspaces).toContain('packages/*');
  });

  test('should have monorepo management scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'dev',
      'build',
      'start',
      'install:all',
      'clean',
      'test',
      'test:watch',
      'test:coverage'
    ];

    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script);
      expect(typeof packageJson.scripts[script]).toBe('string');
    });
  });

  test('should have development dependencies for monorepo management', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDevDeps = [
      'concurrently',
      'cross-env',
      'jest',
      'jest-environment-jsdom'
    ];

    requiredDevDeps.forEach(dep => {
      expect(packageJson.devDependencies).toHaveProperty(dep);
      expect(typeof packageJson.devDependencies[dep]).toBe('string');
    });
  });

  test('should have correct project metadata', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('chess-trainer');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.description).toContain('chess opening trainer');
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe('commonjs');
  });

  test('should have proper Jest configuration for monorepo', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.jest).toBeDefined();
    expect(packageJson.jest.testEnvironment).toBe('node');
    expect(packageJson.jest.collectCoverageFrom).toContain('packages/**/*.{js,ts,tsx}');
    expect(packageJson.jest.collectCoverageFrom).toContain('tools/**/*.js');
    expect(packageJson.jest.testMatch).toContain('**/tests/**/*.test.js');
    
    // Coverage thresholds
    expect(packageJson.jest.coverageThreshold.global.branches).toBe(90);
    expect(packageJson.jest.coverageThreshold.global.functions).toBe(90);
    expect(packageJson.jest.coverageThreshold.global.lines).toBe(90);
    expect(packageJson.jest.coverageThreshold.global.statements).toBe(90);
  });

  test('should have engines specification', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();
    expect(packageJson.engines.npm).toBeDefined();
  });
});
