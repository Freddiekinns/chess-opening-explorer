/**
 * Vercel API Endpoint: /api/courses
 * 
 * This is a thin wrapper that adapts the Express router from the development
 * environment to work with Vercel's serverless function format.
 * 
 * Business logic is in: packages/api/src/routes/courses.routes.js
 * This file only handles Vercel-specific request/response adaptation.
 */

const express = require('express');
const courseRoutes = require('../packages/api/src/routes/courses.routes');

// Create a minimal Express app to handle the router
const app = express();

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the development router directly (note: courses exports a factory function)
app.use('/api/courses', courseRoutes());

// Vercel export handler
module.exports = async (req, res) => {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Convert Vercel request to Express request format
  req.url = req.url || `/api/courses${req.path || ''}`;
  req.method = req.method || 'GET';
  
  // Handle the request using the Express router
  return new Promise((resolve) => {
    app(req, res);
    res.on('finish', resolve);
  });
};
