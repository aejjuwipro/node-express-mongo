const crypto = require('node:crypto');
const config = require('../config/environment');

const sendOtp = async (mobile) => ({
  provider: config.otpProvider,
  mobile,
  pass: crypto.randomInt(0, 1000000).toString().padStart(6, '0'),
});

module.exports = { sendOtp };
