const fs = require('fs');
const path = require('path');

describe('Monorepo Directory Structure', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  
  const expectedDirectories = [
    'packages',
    'packages/api',
    'packages/api/src',
    'packages/api/src/routes',
    'packages/api/src/services',
    'packages/api/tests',
    'packages/api/tests/integration',
    'packages/api/tests/unit',
    'packages/web',
    'packages/web/src',
    'packages/web/src/pages',
    'packages/web/src/components',
    'packages/web/src/hooks',
    'packages/web/src/services',
    'packages/web/src/styles',
    'packages/web/src/utils',
    'packages/shared',
    'packages/shared/src',
    'tools',
    'data',
    'data/eco',
    'docs',
    'docs/archive'
  ];

  test('should have all required directories in monorepo structure', () => {
    expectedDirectories.forEach(dir => {
      const fullPath = path.join(projectRoot, dir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).isDirectory()).toBe(true);
    });
  });

  test('should have .gitignore file at project root', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(fs.statSync(gitignorePath).isFile()).toBe(true);
  });

  test('gitignore should contain essential patterns', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    
    const requiredPatterns = [
      'node_modules/',
      '*.db',
      '.env',
      'dist/',
      'build/',
      '.DS_Store',
      '*.log'
    ];

    requiredPatterns.forEach(pattern => {
      expect(content).toContain(pattern);
    });
  });
});
