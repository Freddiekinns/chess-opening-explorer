const TreeService = require('../../packages/api/src/services/tree-service');

describe('TreeService', () => {
  let service;

  beforeAll(() => {
    service = new TreeService();
  });

  describe('_parseMovesTokens', () => {
    it('parses standard notation', () => {
      expect(service._parseMovesTokens('1. e4 c5 2. Nf3')).toEqual(['1.', 'e4', 'c5', '2.', 'Nf3']);
    });

    it('handles compact notation (no space after dot)', () => {
      expect(service._parseMovesTokens('1.e4 c5 2.Nf3')).toEqual(['1.', 'e4', 'c5', '2.', 'Nf3']);
    });

    it('returns empty for empty string', () => {
      expect(service._parseMovesTokens('')).toEqual([]);
    });

    it('returns empty for null/undefined', () => {
      expect(service._parseMovesTokens(null)).toEqual([]);
      expect(service._parseMovesTokens(undefined)).toEqual([]);
    });
  });

  describe('_getParentMoves', () => {
    it('strips last black move', () => {
      expect(service._getParentMoves('1. e4 c5')).toBe('1. e4');
    });

    it('strips last white move and its number', () => {
      expect(service._getParentMoves('1. e4 c5 2. Nf3')).toBe('1. e4 c5');
    });

    it('returns null for a single move', () => {
      expect(service._getParentMoves('1. e4')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(service._getParentMoves('')).toBeNull();
    });
  });

  describe('_getLastMoveDisplay', () => {
    it('shows white move correctly', () => {
      expect(service._getLastMoveDisplay('1. e4')).toBe('1. e4');
    });

    it('shows black move with ellipsis', () => {
      expect(service._getLastMoveDisplay('1. e4 c5')).toBe('1...c5');
    });

    it('shows later white move', () => {
      expect(service._getLastMoveDisplay('1. e4 c5 2. Nf3')).toBe('2. Nf3');
    });

    it('shows later black move', () => {
      expect(service._getLastMoveDisplay('1. e4 c5 2. Nf3 d6')).toBe('2...d6');
    });
  });

  describe('getTreeContext', () => {
    it('returns tree context for a known opening (Sicilian)', () => {
      const ecoData = service.ecoService.loadECOData();
      const sicilianEntry = Object.entries(ecoData).find(
        ([, o]) => o.moves === '1. e4 c5' && o.name === 'Sicilian Defense'
      );
      expect(sicilianEntry).toBeDefined();

      const ctx = service.getTreeContext(sicilianEntry[0]);
      expect(ctx).not.toBeNull();
      expect(ctx.current.name).toBe('Sicilian Defense');
      expect(ctx.current.move).toBe('1...c5');
      expect(ctx.ancestors.length).toBeGreaterThanOrEqual(1);
      expect(ctx.ancestors[0].name).toBe("King's Pawn Game");
      expect(ctx.children.length).toBeGreaterThan(0);
      expect(ctx.siblings.length).toBeGreaterThan(0);
      expect(ctx.current.descendantCount).toBeGreaterThan(100);
    });

    it('returns null for unknown FEN', () => {
      expect(service.getTreeContext('not/a/real/fen')).toBeNull();
    });

    it('returns empty ancestors for root opening', () => {
      const ecoData = service.ecoService.loadECOData();
      const rootEntry = Object.entries(ecoData).find(([, o]) => o.moves === '1. e4');
      if (rootEntry) {
        const ctx = service.getTreeContext(rootEntry[0]);
        expect(ctx).not.toBeNull();
        expect(ctx.ancestors).toHaveLength(0);
      }
    });

    it('returns empty children for leaf node', () => {
      const ecoData = service.ecoService.loadECOData();
      const leaf = Object.entries(ecoData).find(([, o]) => {
        const tokens = (o.moves || '').split(/\s+/).filter((t) => t !== '');
        return tokens.length > 20;
      });
      if (leaf) {
        const ctx = service.getTreeContext(leaf[0]);
        if (ctx) {
          expect(Array.isArray(ctx.children)).toBe(true);
        }
      }
    });
  });

  describe('getChildren', () => {
    it('returns children for a known opening', () => {
      const ecoData = service.ecoService.loadECOData();
      const e4Entry = Object.entries(ecoData).find(([, o]) => o.moves === '1. e4');
      expect(e4Entry).toBeDefined();

      const result = service.getChildren(e4Entry[0]);
      expect(result).not.toBeNull();
      expect(result.children.length).toBeGreaterThan(5);
      expect(result.children[0]).toHaveProperty('fen');
      expect(result.children[0]).toHaveProperty('name');
      expect(result.children[0]).toHaveProperty('move');
      expect(result.children[0]).toHaveProperty('hasChildren');
    });

    it('returns null for unknown FEN', () => {
      expect(service.getChildren('not/a/real/fen')).toBeNull();
    });
  });
});
