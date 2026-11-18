const jwt = require('jsonwebtoken');
const config = require('../config/environment');

const safeUser = (user) => ({
  id: user.id,
  name: user.name || null,
  email: user.email || null,
  emailVerified: Boolean(user.emailVerifiedAt),
  mobile: user.mobile || null,
  mobileVerified: Boolean(user.mobileVerifiedAt),
});

const createToken = (user) => jwt.sign(
  { sub: user.id },
  config.jwtSecret,
  { expiresIn: '1h' },
);

const sendAuthResponse = (res, user, status = 200) => {
  res.status(status).json({
    user: safeUser(user),
    token: createToken(user),
  });
};

module.exports = { safeUser, createToken, sendAuthResponse };
