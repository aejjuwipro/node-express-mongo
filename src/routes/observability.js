const express = require('express');
const mongoose = require('mongoose');
const { renderMetrics } = require('../observability/metrics');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/health/live', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ status: 'ok' });
});

router.get('/health/ready', async (req, res) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return res.status(503).set('Cache-Control', 'no-store').json({ status: 'not_ready' });
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.set('Cache-Control', 'no-store').json({ status: 'ready' });
  } catch (error) {
    logger.error('Readiness check failed', { error_type: error.name });
    return res.status(503).set('Cache-Control', 'no-store').json({ status: 'not_ready' });
  }
});

router.get('/metrics', (req, res) => {
  res
    .type('text/plain; version=0.0.4; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(renderMetrics());
});

module.exports = router;
