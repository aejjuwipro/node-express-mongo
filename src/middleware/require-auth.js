const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const User = require('../models/user');

const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(payload.sub)
      .select('_id name email mobile mobileVerifiedAt');
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireAuth;
