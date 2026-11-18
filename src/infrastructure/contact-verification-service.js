const crypto = require('node:crypto');

const sendVerificationCode = async (channel, value) => ({
  provider: 'mock',
  channel,
  value,
  code: crypto.randomInt(0, 1000000).toString().padStart(6, '0'),
  warning: `Development mock ${channel} verification code; it was not sent by ${channel === 'email' ? 'email' : 'SMS'}.`,
});

module.exports = { sendVerificationCode };
