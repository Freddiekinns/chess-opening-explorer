/**
 * Vercel API Endpoint: /api/personal
 *
 * Thin wrapper around: packages/api/src/routes/personal.routes.js
 */

const express = require('express');
const createPersonalRoutes = require('../packages/api/src/routes/personal.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/personal', createPersonalRoutes());

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const basePath = '/api/personal';
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
