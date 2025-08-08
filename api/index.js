const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import routes
const openingRoutes = require('../packages/api/src/routes/openings.routes');
const statsRoutes = require('../packages/api/src/routes/stats.routes');
const courseRoutes = require('../packages/api/src/routes/courses.routes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration for Vercel
app.use(cors({
  origin: process.env.VERCEL_URL ? 
    [process.env.VERCEL_URL, `https://${process.env.VERCEL_URL}`] : 
    ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: 'vercel'
  });
});

// API routes
app.use('/api/openings', openingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/courses', courseRoutes());

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Chess Trainer API is running on Vercel',
    version: '1.0.0',
    environment: 'production'
  });
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

module.exports = app;
