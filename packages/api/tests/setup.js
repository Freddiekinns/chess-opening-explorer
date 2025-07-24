// Test setup for API package
const { execSync } = require('child_process');
const path = require('path');

// Global test setup
beforeAll(() => {
  // Ensure test database is clean
  console.log('Setting up test environment...');
});

afterAll(() => {
  // Clean up test database
  console.log('Cleaning up test environment...');
});

// Global test utilities
global.testUtils = {
  // Helper function to create test database
  createTestDb: () => {
    // Database creation logic will be added here
  },
  
  // Helper function to clean test database
  cleanTestDb: () => {
    // Database cleanup logic will be added here
  }
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
