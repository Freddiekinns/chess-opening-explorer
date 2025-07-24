const { connectDatabase } = require('../models/database');

// Database test utilities
class DatabaseTestUtils {
  constructor() {
    this.originalEnv = process.env.NODE_ENV;
  }

  // Set up test database
  async setupTestDatabase() {
    process.env.NODE_ENV = 'test';
    
    const db = await connectDatabase();
    await this.clearDatabase(db);
    
    return db;
  }

  // Clean up test database
  async teardownTestDatabase() {
    const db = await connectDatabase();
    await this.clearDatabase(db);
    await db.close();
    
    process.env.NODE_ENV = this.originalEnv;
  }

  // Clear all data from database
  async clearDatabase(db) {
    // Get all tables that exist in the database
    const result = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const tables = result.map(row => row.name);
    
    // Clear data from tables in reverse dependency order
    const tablesToClear = [
      'training_progress',
      'user_stats', 
      'training_sessions',
      'games',
      'positions',
      'openings'
    ];
    
    for (const table of tablesToClear) {
      if (tables.includes(table)) {
        await db.run(`DELETE FROM ${table}`);
      }
    }
  }

  // Create sample opening for testing
  async createSampleOpening(db, overrides = {}) {
    const defaultOpening = {
      name: 'Test Opening',
      eco_code: 'A00',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '1. e4',
      moves: 'e4',
      category: 'Test',
      subcategory: 'Test Subcategory',
      description: 'A test opening',
      popularity: 50,
      difficulty: 2
    };

    const opening = { ...defaultOpening, ...overrides };
    
    const result = await db.run(`
      INSERT INTO openings (name, eco_code, fen, pgn, moves, category, subcategory, description, popularity, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      opening.name,
      opening.eco_code,
      opening.fen,
      opening.pgn,
      opening.moves,
      opening.category,
      opening.subcategory,
      opening.description,
      opening.popularity,
      opening.difficulty
    ]);

    return { id: result.lastID, ...opening };
  }

  // Create sample position for testing
  async createSamplePosition(db, openingId, overrides = {}) {
    const defaultPosition = {
      opening_id: openingId,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      move_number: 1,
      side_to_move: 'black',
      san_move: 'e4',
      uci_move: 'e2e4',
      comment: 'Test position',
      evaluation: 0.2,
      is_critical: false
    };

    const position = { ...defaultPosition, ...overrides };
    
    const result = await db.run(`
      INSERT INTO positions (opening_id, fen, move_number, side_to_move, san_move, uci_move, comment, evaluation, is_critical)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      position.opening_id,
      position.fen,
      position.move_number,
      position.side_to_move,
      position.san_move,
      position.uci_move,
      position.comment,
      position.evaluation,
      position.is_critical
    ]);

    return { id: result.lastID, ...position };
  }

  // Create sample game for testing
  async createSampleGame(db, openingId, overrides = {}) {
    const defaultGame = {
      white_player: 'Test Player 1',
      black_player: 'Test Player 2',
      white_elo: 1800,
      black_elo: 1750,
      result: '1-0',
      date: '2024-01-01',
      event: 'Test Tournament',
      site: 'Test Site',
      opening_id: openingId,
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 1-0',
      eco_code: 'A00',
      time_control: '15+10',
      termination: 'Normal'
    };

    const game = { ...defaultGame, ...overrides };
    
    const result = await db.run(`
      INSERT INTO games (white_player, black_player, white_elo, black_elo, result, date, event, site, opening_id, pgn, eco_code, time_control, termination)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      game.white_player,
      game.black_player,
      game.white_elo,
      game.black_elo,
      game.result,
      game.date,
      game.event,
      game.site,
      game.opening_id,
      game.pgn,
      game.eco_code,
      game.time_control,
      game.termination
    ]);

    return { id: result.lastID, ...game };
  }

  // Create sample training session for testing
  async createSampleTrainingSession(db, openingId, overrides = {}) {
    const defaultSession = {
      user_id: 'test_user',
      opening_id: openingId,
      session_type: 'study',
      score: 85,
      total_questions: 10,
      correct_answers: 9,
      time_spent: 600,
      difficulty_level: 2,
      completed: true,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    const session = { ...defaultSession, ...overrides };
    
    const result = await db.run(`
      INSERT INTO training_sessions (user_id, opening_id, session_type, score, total_questions, correct_answers, time_spent, difficulty_level, completed, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.user_id,
      session.opening_id,
      session.session_type,
      session.score,
      session.total_questions,
      session.correct_answers,
      session.time_spent,
      session.difficulty_level,
      session.completed,
      session.started_at,
      session.completed_at
    ]);

    return { id: result.lastID, ...session };
  }

  // Wait for a short period (useful for testing time-based operations)
  async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Assert that a database query returns expected results
  async assertQueryResult(db, query, params, expectedCount, message = '') {
    const result = await db.all(query, params);
    
    if (result.length !== expectedCount) {
      throw new Error(`${message} Expected ${expectedCount} results, got ${result.length}`);
    }
    
    return result;
  }

  // Assert that a database query returns a single row
  async assertQuerySingleResult(db, query, params, message = '') {
    const result = await db.get(query, params);
    
    if (!result) {
      throw new Error(`${message} Expected single result, got null`);
    }
    
    return result;
  }

  // Assert that a database query returns no results
  async assertQueryNoResults(db, query, params, message = '') {
    const result = await db.all(query, params);
    
    if (result.length > 0) {
      throw new Error(`${message} Expected no results, got ${result.length}`);
    }
    
    return result;
  }

  // Get table row count
  async getTableRowCount(db, tableName) {
    const result = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result.count;
  }

  // Check if table exists
  async tableExists(db, tableName) {
    const result = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `, [tableName]);
    
    return result !== undefined;
  }

  // Check if index exists
  async indexExists(db, indexName) {
    const result = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name=?
    `, [indexName]);
    
    return result !== undefined;
  }

  // Get all tables in database
  async getAllTables(db) {
    const result = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    return result.map(row => row.name);
  }

  // Get all indexes in database
  async getAllIndexes(db) {
    const result = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    return result.map(row => row.name);
  }

  // Execute multiple SQL statements
  async executeSqlStatements(db, statements) {
    const results = [];
    
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        const result = await db.run(statement);
        results.push(result);
      } catch (error) {
        throw new Error(`Failed to execute statement: ${statement}\nError: ${error.message}`);
      }
    }
    
    return results;
  }

  // Create test data set
  async createTestDataSet(db) {
    // Create test opening
    const opening = await this.createSampleOpening(db, {
      name: 'Italian Game',
      eco_code: 'C53',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4',
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Be7',
      moves: 'e4 e5 Nf3 Nc6 Bc4 Be7',
      category: 'King Pawn',
      subcategory: 'Italian Game',
      description: 'A classical opening',
      popularity: 85,
      difficulty: 2
    });

    // Create test positions
    const positions = [];
    for (let i = 1; i <= 3; i++) {
      const position = await this.createSamplePosition(db, opening.id, {
        move_number: i,
        side_to_move: i % 2 === 0 ? 'white' : 'black',
        is_critical: i === 2
      });
      positions.push(position);
    }

    // Create test game
    const game = await this.createSampleGame(db, opening.id, {
      white_player: 'Magnus Carlsen',
      black_player: 'Fabiano Caruana',
      white_elo: 2830,
      black_elo: 2820,
      result: '1/2-1/2',
      event: 'World Championship'
    });

    // Create test training session
    const session = await this.createSampleTrainingSession(db, opening.id, {
      user_id: 'test_user_123',
      session_type: 'drill',
      score: 90,
      total_questions: 15,
      correct_answers: 14
    });

    return {
      opening,
      positions,
      game,
      session
    };
  }
}

module.exports = new DatabaseTestUtils();
