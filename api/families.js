/**
 * Vercel API Endpoint: /api/families
 *
 * Thin wrapper that adapts the Express router from the development environment
 * to Vercel's serverless function format.
 *
 * Business logic is in: packages/api/src/routes/families.routes.js
 */

const express = require('express');
const familiesRouter = require('../packages/api/src/routes/families.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/families', familiesRouter);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const basePath = '/api/families';
  const originalUrl = req.url || req.path || '';
  req.url = originalUrl.startsWith(basePath)
    ? originalUrl
    : `${basePath}${originalUrl.startsWith('/') ? '' : '/'}${originalUrl}`;
  req.method = req.method || 'GET';

  return new Promise((resolve) => {
    app(req, res);
    res.on('finish', resolve);
  });
};
