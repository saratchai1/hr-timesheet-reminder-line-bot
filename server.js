// ============================================================================
// HR Timesheet Reminder LINE Bot — Main Server (Serverless Compatible)
// ============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./src/database');

// Import route handlers
const employeesRouter = require('./src/routes/employees');
const timesheetRouter = require('./src/routes/timesheet');
const notificationsRouter = require('./src/routes/notifications');
const webhookRouter = require('./src/routes/webhook');
const cronRouter = require('./src/routes/cron');

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// ── Middleware ───────────────────────────────────────────────────────────────

// CORS — allow all origins for development
app.use(cors());

// Parse JSON bodies for all routes EXCEPT /webhook (LINE SDK needs raw body)
app.use((req, res, next) => {
  // Use .includes instead of startsWith to handle Netlify function prefixes
  if (req.path.includes('/webhook')) {
    return next();
  }
  express.json()(req, res, next);
});

// Serve static files from /public
// Note: In Netlify, static files are handled by the publish directory. 
// This is mainly for local development.
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ──────────────────────────────────────────────────────────────────

// We allow matching either /api/... or /.netlify/functions/api/... depending on environment
const apiPrefix = process.env.NETLIFY ? '/.netlify/functions/api' : '/api';
const webhookPath = process.env.NETLIFY ? '/.netlify/functions/api/webhook' : '/webhook';

app.use(`${apiPrefix}/employees`, employeesRouter);
app.use(`${apiPrefix}/timesheet`, timesheetRouter);
app.use(`${apiPrefix}/notifications`, notificationsRouter);
app.use(`${apiPrefix}/cron`, cronRouter);
app.use(webhookPath, webhookRouter);

// Health check endpoint
app.get(`${apiPrefix}/health`, (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      demoMode: DEMO_MODE,
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler for unknown API routes
app.use(`${apiPrefix}/*`, (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ไม่พบเส้นทาง API ที่ร้องขอ',
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
});

// ── Startup ─────────────────────────────────────────────────────────────────

// Only start the server if this file is run directly (local dev)
if (require.main === module) {
  initDatabase();
  app.listen(PORT, () => {
    console.log('');
    console.log('\x1b[36m══════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[36m   HR Timesheet Reminder LINE Bot\x1b[0m');
    console.log('\x1b[36m══════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[33m   🌐 Server:\x1b[0m  http://localhost:${PORT}`);
    console.log(`\x1b[33m   📡 Webhook:\x1b[0m http://localhost:${PORT}/webhook`);
    console.log(`\x1b[33m   🎮 Mode:\x1b[0m    ${
      DEMO_MODE ? '\x1b[35mDEMO\x1b[0m' : '\x1b[32mPRODUCTION\x1b[0m'
    }`);
    console.log('\x1b[36m══════════════════════════════════════════════\x1b[0m');
    console.log('');
  });
}

// Export the app for Netlify functions
module.exports = app;
