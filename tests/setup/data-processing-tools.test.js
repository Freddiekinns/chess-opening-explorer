const fs = require('fs');
const path = require('path');

describe('Chess Opening Trainer Setup', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const webPackagePath = path.join(projectRoot, 'packages', 'web');
  const apiPackagePath = path.join(projectRoot, 'packages', 'api');

  test('should have React chessboard dependencies', () => {
    const packageJsonPath = path.join(webPackagePath, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for chess-related dependencies
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(allDeps).toHaveProperty('react-chessboard');
    
    // Use different matcher to check for chess.js
    expect(allDeps['chess.js']).toBeDefined();
    expect(allDeps['chess.js']).toMatch(/^\^1\.\d+\.\d+$/);
  });

  test('should have ECO data service', () => {
    const ecoServicePath = path.join(apiPackagePath, 'src', 'services', 'eco-service.js');
    expect(fs.existsSync(ecoServicePath)).toBe(true);
    expect(fs.statSync(ecoServicePath).isFile()).toBe(true);
  });

  test('should have opening trainer API routes', () => {
    const openingRoutesPath = path.join(apiPackagePath, 'src', 'routes', 'openings.js');
    expect(fs.existsSync(openingRoutesPath)).toBe(true);
    expect(fs.statSync(openingRoutesPath).isFile()).toBe(true);
  });

  test('should have ECO data directory', () => {
    const ecoDataPath = path.join(projectRoot, 'data', 'eco');
    expect(fs.existsSync(ecoDataPath)).toBe(true);
    expect(fs.statSync(ecoDataPath).isDirectory()).toBe(true);
  });

  test('should have API scripts for ECO data import', () => {
    const packageJsonPath = path.join(apiPackagePath, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.scripts).toHaveProperty('eco:import');
    expect(packageJson.scripts).toHaveProperty('eco:update');
  });

  test('should have React pages for current architecture', () => {
    // Check for the current simplified two-page architecture
    // The actual files are TypeScript files, not JSX
    const landingPagePath = path.join(webPackagePath, 'src', 'pages', 'LandingPage.tsx');
    const detailPagePath = path.join(webPackagePath, 'src', 'pages', 'OpeningDetailPage.tsx');
    
    expect(fs.existsSync(landingPagePath)).toBe(true);
    expect(fs.existsSync(detailPagePath)).toBe(true);
  });
});
