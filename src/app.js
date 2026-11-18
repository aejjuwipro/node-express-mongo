const express = require('express');
const path = require('node:path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');
const observabilityRoutes = require('./routes/observability');
const logger = require('./utils/logger');
const { recordRequest } = require('./observability/metrics');

const app = express();
const publicDirectory = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (req.path !== '/metrics') {
      recordRequest(req.method, res.statusCode, durationMs / 1000);
    }
    logger.debug('HTTP request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
});
app.use(express.static(publicDirectory));

app.get('/', (req, res) => {
  res.json({ message: 'Express + MongoDB running in Docker on WSL!' });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'login.html'));
});

app.get('/registration', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'registration.html'));
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/items', itemRoutes);
app.use(observabilityRoutes);

app.use((err, req, res, next) => {
  console.error('Request error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
