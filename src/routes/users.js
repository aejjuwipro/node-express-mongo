const express = require('express');
const requireAuth = require('../middleware/require-auth');
const { safeUser } = require('../utils/auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.authenticatedUser) });
});

router.patch('/me', requireAuth, async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Name must be between 1 and 80 characters' });
  }

  try {
    req.authenticatedUser.name = name;
    await req.authenticatedUser.save();
    return res.json({ user: safeUser(req.authenticatedUser) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
