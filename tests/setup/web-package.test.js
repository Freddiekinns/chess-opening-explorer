const fs = require('fs');
const path = require('path');

describe('Web Package Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const webPackagePath = path.join(projectRoot, 'packages', 'web');
  const packageJsonPath = path.join(webPackagePath, 'package.json');

  test('should have package.json file in web package', () => {
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    expect(fs.statSync(packageJsonPath).isFile()).toBe(true);
  });

  test('should have valid JSON structure', () => {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('should have correct package metadata', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('@chess-trainer/web');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.description).toContain('Chess Trainer Web');
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe('module');
  });

  test('should have React development scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'dev',
      'build',
      'preview',
      'start',
      'test',
      'test:watch',
      'lint',
      'lint:fix',
      'type-check'
    ];

    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script);
      expect(typeof packageJson.scripts[script]).toBe('string');
    });
  });

  test('should have required production dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'react',
      'react-dom',
      'react-router-dom',
      'axios'
    ];

    requiredDeps.forEach(dep => {
      expect(packageJson.dependencies).toHaveProperty(dep);
      expect(typeof packageJson.dependencies[dep]).toBe('string');
    });
  });

  test('should have required development dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDevDeps = [
      'vite',
      '@vitejs/plugin-react',
      '@types/react',
      '@types/react-dom',
      'typescript',
      'eslint',
      '@testing-library/react',
      '@testing-library/jest-dom',
      'vitest'
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

  test('should have Vite configuration file', () => {
    const viteConfigPath = path.join(webPackagePath, 'vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);
    expect(fs.statSync(viteConfigPath).isFile()).toBe(true);
  });

  test('should have TypeScript configuration file', () => {
    const tsconfigPath = path.join(webPackagePath, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    expect(fs.statSync(tsconfigPath).isFile()).toBe(true);
  });

  test('should have index.html file', () => {
    const indexHtmlPath = path.join(webPackagePath, 'index.html');
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
    expect(fs.statSync(indexHtmlPath).isFile()).toBe(true);
  });

  test('should have main entry point', () => {
    const mainPath = path.join(webPackagePath, 'src', 'main.tsx');
    expect(fs.existsSync(mainPath)).toBe(true);
    expect(fs.statSync(mainPath).isFile()).toBe(true);
  });

  test('should have App component', () => {
    const appPath = path.join(webPackagePath, 'src', 'App.tsx');
    expect(fs.existsSync(appPath)).toBe(true);
    expect(fs.statSync(appPath).isFile()).toBe(true);
  });

  test('should have web gitignore file', () => {
    const gitignorePath = path.join(webPackagePath, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(fs.statSync(gitignorePath).isFile()).toBe(true);
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('dist');
    expect(content).toContain('node_modules');
    expect(content).toContain('.env');
  });

  test('should have ESLint configuration', () => {
    const eslintPath = path.join(webPackagePath, '.eslintrc.cjs');
    expect(fs.existsSync(eslintPath)).toBe(true);
    expect(fs.statSync(eslintPath).isFile()).toBe(true);
  });

  test('should have Vitest configuration', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if vitest config is in package.json or separate file
    const vitestConfigPath = path.join(webPackagePath, 'vitest.config.ts');
    const hasVitestConfig = fs.existsSync(vitestConfigPath) || Boolean(packageJson.vitest);
    
    expect(hasVitestConfig).toBe(true);
  });

  test('should have environment configuration', () => {
    const envExamplePath = path.join(webPackagePath, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    expect(fs.statSync(envExamplePath).isFile()).toBe(true);
  });
});
