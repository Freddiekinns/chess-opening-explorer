/**
 * Shared Package Setup Tests
 * 
 * Following TDD principles:
 * - Test behavior, not implementation
 * - Mock external dependencies  
 * - Fast, isolated tests
 */

const fs = require('fs');
const path = require('path');

describe('Shared Package Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const sharedPackagePath = path.join(projectRoot, 'packages', 'shared');
  const packageJsonPath = path.join(sharedPackagePath, 'package.json');

  test('should have package.json file in shared package', () => {
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    expect(fs.statSync(packageJsonPath).isFile()).toBe(true);
  });

  test('should have valid JSON structure', () => {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('should have correct package metadata', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('@chess-trainer/shared');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.description).toContain('Chess Trainer Shared');
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe('module');
    expect(packageJson.main).toBe('dist/index.js');
    expect(packageJson.types).toBe('dist/index.d.ts');
  });

  test('should have shared package scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'build',
      'dev',
      'test',
      'test:watch',
      'type-check',
      'lint',
      'lint:fix',
      'clean'
    ];

    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script);
      expect(typeof packageJson.scripts[script]).toBe('string');
    });
  });

  test('should have required development dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDevDeps = [
      'typescript',
      'vitest',
      'eslint',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser'
    ];

    requiredDevDeps.forEach(dep => {
      expect(packageJson.devDependencies).toHaveProperty(dep);
      expect(typeof packageJson.devDependencies[dep]).toBe('string');
    });
  });

  test('should have engines specification', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();
  });

  test('should have TypeScript configuration file', () => {
    const tsconfigPath = path.join(sharedPackagePath, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    expect(fs.statSync(tsconfigPath).isFile()).toBe(true);
  });

  test('should have main entry point', () => {
    const indexPath = path.join(sharedPackagePath, 'src', 'index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    expect(fs.statSync(indexPath).isFile()).toBe(true);
  });

  test('should have types directory with type definitions', () => {
    const typesPath = path.join(sharedPackagePath, 'src', 'types');
    expect(fs.existsSync(typesPath)).toBe(true);
    expect(fs.statSync(typesPath).isDirectory()).toBe(true);
    
    const chessTypesPath = path.join(typesPath, 'chess.ts');
    expect(fs.existsSync(chessTypesPath)).toBe(true);
    expect(fs.statSync(chessTypesPath).isFile()).toBe(true);
  });

  test('should have utils directory with utility functions', () => {
    const utilsPath = path.join(sharedPackagePath, 'src', 'utils');
    expect(fs.existsSync(utilsPath)).toBe(true);
    expect(fs.statSync(utilsPath).isDirectory()).toBe(true);
    
    const validationPath = path.join(utilsPath, 'validation.ts');
    expect(fs.existsSync(validationPath)).toBe(true);
    expect(fs.statSync(validationPath).isFile()).toBe(true);
  });

  test('should have schemas directory with validation schemas', () => {
    const schemasPath = path.join(sharedPackagePath, 'src', 'schemas');
    expect(fs.existsSync(schemasPath)).toBe(true);
    expect(fs.statSync(schemasPath).isDirectory()).toBe(true);
    
    const openingSchemaPath = path.join(schemasPath, 'opening.ts');
    expect(fs.existsSync(openingSchemaPath)).toBe(true);
    expect(fs.statSync(openingSchemaPath).isFile()).toBe(true);
  });

  test('should have shared gitignore file', () => {
    const gitignorePath = path.join(sharedPackagePath, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(fs.statSync(gitignorePath).isFile()).toBe(true);
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('dist');
    expect(content).toContain('node_modules');
  });

  test('should have ESLint configuration', () => {
    const eslintPath = path.join(sharedPackagePath, '.eslintrc.js');
    expect(fs.existsSync(eslintPath)).toBe(true);
    expect(fs.statSync(eslintPath).isFile()).toBe(true);
  });

  test('should have build configuration', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for build tools configuration
    expect(packageJson.files).toBeDefined();
    expect(Array.isArray(packageJson.files)).toBe(true);
    expect(packageJson.files).toContain('dist');
    
    // Check for export maps
    expect(packageJson.exports).toBeDefined();
    expect(packageJson.exports['.']).toBeDefined();
  });

  test('should have Vitest configuration', () => {
    const vitestConfigPath = path.join(sharedPackagePath, 'vitest.config.ts');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const hasVitestConfig = fs.existsSync(vitestConfigPath) || Boolean(packageJson.vitest);
    expect(hasVitestConfig).toBe(true);
  });
});
