/**
 * @fileoverview Static CSS analysis for opening detail page layout.
 * Validates sticky board pattern and FEN styling conventions.
 */

import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

function readCSS(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Opening Detail Page Layout', () => {
  const simplified = readCSS('packages/web/src/styles/simplified.css');
  const detailModule = readCSS('packages/web/src/pages/OpeningDetailPage.module.css');
  const navigatorModule = readCSS('packages/web/src/components/detail/OpeningNavigator.module.css');

  describe('two-column grid', () => {
    test('uses align-items: start (not stretch) to prevent blank space', () => {
      expect(simplified).toMatch(/\.two-column-layout\s*\{[^}]*align-items:\s*start/);
      expect(simplified).not.toMatch(/\.two-column-layout\s*\{[^}]*align-items:\s*stretch/);
    });

    test('left column is sticky on desktop so board stays visible', () => {
      expect(simplified).toMatch(/\.left-column\s*\{[^}]*position:\s*sticky/);
    });

    test('left column sticky is disabled on mobile/tablet', () => {
      // Inside the ≤1024px media query, left-column should be static
      const tabletBlock = simplified.match(/@media\s*\(max-width:\s*1024px\)\s*\{([\s\S]*?)\n\}/);
      expect(tabletBlock).not.toBeNull();
      expect(tabletBlock![1]).toMatch(/\.left-column\s*\{[^}]*position:\s*static/);
    });

    test('collapses to single column at ≤1024px', () => {
      expect(simplified).toMatch(
        /@media[^{]*max-width:\s*1024px[^{]*\{[^}]*\.two-column-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
      );
    });
  });

  describe('navigator scroll', () => {
    test('navigator does not have overflow-y: auto (no nested scroll)', () => {
      expect(navigatorModule).not.toMatch(/\.navigator\s*\{[^}]*overflow-y:\s*auto/);
    });

    test('navigator does not use flex: 1 to absorb height', () => {
      expect(navigatorModule).not.toMatch(/\.navigator\s*\{[^}]*flex:\s*1/);
    });
  });

  describe('FEN input styling', () => {
    test('uses primary font, not monospace', () => {
      const fenBlock = simplified.match(/\.chessboard-fen-utilities\s+\.fen-input\s*\{[^}]*\}/);
      expect(fenBlock).not.toBeNull();
      expect(fenBlock![0]).toContain('--font-family-primary');
      expect(fenBlock![0]).not.toContain('--font-family-mono');
    });

    test('uses compact font size on desktop (--text-sm)', () => {
      const fenBlock = simplified.match(/\.chessboard-fen-utilities\s+\.fen-input\s*\{[^}]*\}/);
      expect(fenBlock).not.toBeNull();
      expect(fenBlock![0]).toContain('--text-sm');
    });
  });
});
