/**
 * Eco Service Unit Tests
 * 
 * Following TDD principles:
 * - Test behavior, not implementation
 * - Mock external dependencies  
 * - Fast, isolated tests
 */

const ECOService = require('../../packages/api/src/services/eco-service');
const fs = require('fs');
const path = require('path');

describe('ECOService', () => {
  let ecoService;
  const testDataDir = path.join(__dirname, '../fixtures/eco-test-data');

  beforeEach(() => {
    ecoService = new ECOService();
    // Override data directory for testing
    ecoService.dataDir = testDataDir;
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('ECO Data Loading', () => {
    it('should define the list of ECO files to download', () => {
      expect(ecoService.ecoFiles).toBeDefined();
      expect(Array.isArray(ecoService.ecoFiles)).toBe(true);
      expect(ecoService.ecoFiles).toContain('ecoA.json');
      expect(ecoService.ecoFiles).toContain('ecoB.json');
      expect(ecoService.ecoFiles).toContain('ecoC.json');
      expect(ecoService.ecoFiles).toContain('ecoD.json');
      expect(ecoService.ecoFiles).toContain('ecoE.json');
    });

    it('should load and merge ECO data from multiple files', () => {
      // Create test directory
      fs.mkdirSync(testDataDir, { recursive: true });

      // Create mock ECO data files
      const mockEcoA = {
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1': {
          eco: 'A00',
          name: "King's Pawn Game",
          moves: '1. e4',
          src: 'eco_tsv'
        }
      };

      const mockEcoB = {
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': {
          eco: 'B00',
          name: "King's Pawn Opening",
          moves: '1. e4 e5',
          src: 'eco_tsv'
        }
      };

      fs.writeFileSync(path.join(testDataDir, 'ecoA.json'), JSON.stringify(mockEcoA));
      fs.writeFileSync(path.join(testDataDir, 'ecoB.json'), JSON.stringify(mockEcoB));

      const mergedData = ecoService.loadECOData();

      expect(Object.keys(mergedData)).toHaveLength(2);
      expect(mergedData['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1']).toEqual(mockEcoA['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1']);
      expect(mergedData['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2']).toEqual(mockEcoB['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2']);
    });

    it('should search openings by ECO code', () => {
      // Create test directory and data
      fs.mkdirSync(testDataDir, { recursive: true });
      
      const mockData = {
        'fen1': { eco: 'A00', name: 'Opening 1', moves: '1. e4' },
        'fen2': { eco: 'A00', name: 'Opening 2', moves: '1. e4 e5' },
        'fen3': { eco: 'B00', name: 'Opening 3', moves: '1. d4' }
      };

      fs.writeFileSync(path.join(testDataDir, 'ecoA.json'), JSON.stringify(mockData));

      const results = ecoService.getOpeningsByECO('A00');
      
      expect(results).toHaveLength(2);
      expect(results[0].fen).toBe('fen1');
      expect(results[1].fen).toBe('fen2');
    });

    it('should return a random opening', () => {
      // Create test directory and data
      fs.mkdirSync(testDataDir, { recursive: true });
      
      const mockData = {
        'fen1': { eco: 'A00', name: 'Opening 1', moves: '1. e4' }
      };

      fs.writeFileSync(path.join(testDataDir, 'ecoA.json'), JSON.stringify(mockData));

      const randomOpening = ecoService.getRandomOpening();
      
      expect(randomOpening).toBeDefined();
      expect(randomOpening.fen).toBe('fen1');
      expect(randomOpening.eco).toBe('A00');
      expect(randomOpening.name).toBe('Opening 1');
    });
  });
});
