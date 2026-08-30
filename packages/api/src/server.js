const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// quiet silences dotenv 17's startup banner, which is an advert with a rotating
// tip in it and prints the resolved .env path. Two lines per dev:api start.
require('dotenv').config({ quiet: true });
// dev:api runs with cwd=packages/api; project-wide secrets (e.g.
// LICHESS_EXPLORER_TOKEN) live in the repo-root .env. dotenv never
// overrides already-set vars, so the local .env above still wins.
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../.env'),
  quiet: true,
});

const app = express();
const PORT = process.env.PORT || 3010;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const openingRoutes = require('./routes/openings.routes');
const statsRoutes = require('./routes/stats.routes');
const courseRoutes = require('./routes/courses.routes');
const personalRoutes = require('./routes/personal.routes');
const familiesRoutes = require('./routes/families.routes');
const explorerRoutes = require('./routes/explorer.routes');

app.use('/api/openings', openingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/courses', courseRoutes());
app.use('/api/personal', personalRoutes());
app.use('/api/families', familiesRoutes);
app.use('/api/explorer', explorerRoutes);

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Chess Trainer API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
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
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Start server  
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Chess Trainer API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;

