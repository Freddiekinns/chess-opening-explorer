const fs = require('fs');
const path = require('path');

describe('API Package Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const apiPackagePath = path.join(projectRoot, 'packages', 'api');
  const packageJsonPath = path.join(apiPackagePath, 'package.json');

  test('should have package.json file in API package', () => {
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    expect(fs.statSync(packageJsonPath).isFile()).toBe(true);
  });

  test('should have valid JSON structure', () => {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('should have correct package metadata', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('@chess-trainer/api');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.description).toContain('Chess Trainer API');
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe('commonjs');
    expect(packageJson.main).toBe('src/server.js');
  });

  test('should have API development scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'dev',
      'start',
      'build',
      'test',
      'test:watch',
      'test:integration',
      'lint',
      'lint:fix'
    ];

    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script);
      expect(typeof packageJson.scripts[script]).toBe('string');
    });
  });

  test('should have required production dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'express',
      'cors',
      'helmet',
      'dotenv'
    ];

    requiredDeps.forEach(dep => {
      expect(packageJson.dependencies).toHaveProperty(dep);
      expect(typeof packageJson.dependencies[dep]).toBe('string');
    });
  });

  test('should have required development dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDevDeps = [
      'nodemon',
      'supertest',
      'jest',
      'eslint'
    ];

    requiredDevDeps.forEach(dep => {
      expect(packageJson.devDependencies).toHaveProperty(dep);
      expect(typeof packageJson.devDependencies[dep]).toBe('string');
    });
  });

  test('should have proper Jest configuration for API', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.jest).toBeDefined();
    expect(packageJson.jest.testEnvironment).toBe('node');
    expect(packageJson.jest.setupFilesAfterEnv).toContain('./tests/setup.js');
    expect(packageJson.jest.collectCoverageFrom).toContain('src/**/*.js');
    expect(packageJson.jest.testMatch).toContain('**/tests/**/*.test.js');
  });

  test('should have engines specification', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();
  });

  test('should have server.js entry point', () => {
    const serverPath = path.join(apiPackagePath, 'src', 'server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
    expect(fs.statSync(serverPath).isFile()).toBe(true);
  });

  test('should have environment configuration file', () => {
    const envExamplePath = path.join(apiPackagePath, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    expect(fs.statSync(envExamplePath).isFile()).toBe(true);
  });

  test('should have test setup file', () => {
    const testSetupPath = path.join(apiPackagePath, 'tests', 'setup.js');
    expect(fs.existsSync(testSetupPath)).toBe(true);
    expect(fs.statSync(testSetupPath).isFile()).toBe(true);
  });

  test('should have API gitignore file', () => {
    const gitignorePath = path.join(apiPackagePath, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(fs.statSync(gitignorePath).isFile()).toBe(true);
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('.env');
    expect(content).toContain('*.db');
  });

  test('should have ESLint configuration', () => {
    const eslintPath = path.join(apiPackagePath, '.eslintrc.js');
    expect(fs.existsSync(eslintPath)).toBe(true);
    expect(fs.statSync(eslintPath).isFile()).toBe(true);
  });
});
