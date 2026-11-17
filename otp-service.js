const crypto = require('node:crypto');

const provider = process.env.OTP_PROVIDER || 'mock';

if (provider !== 'mock') {
  throw new Error(`Unsupported OTP_PROVIDER: ${provider}`);
}

const sendOtp = async (mobile) => ({
  provider,
  mobile,
  pass: crypto.randomInt(0, 1000000).toString().padStart(6, '0'),
});

module.exports = { sendOtp };
