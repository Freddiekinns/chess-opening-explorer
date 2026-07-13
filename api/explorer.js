/**
 * Vercel API Endpoint: /api/explorer
 *
 * Thin wrapper that adapts the Express router from the development environment
 * to Vercel's serverless function format.
 *
 * Business logic is in: packages/api/src/routes/explorer.routes.js
 */

const express = require('express');
const explorerRouter = require('../packages/api/src/routes/explorer.routes');

const app = express();

app.use('/api/explorer', explorerRouter);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const basePath = '/api/explorer';
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
