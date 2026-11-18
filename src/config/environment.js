const port = Number(process.env.PORT || 3001);
const jwtSecret = process.env.JWT_SECRET;
const otpProvider = process.env.OTP_PROVIDER || 'mock';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a value of at least 32 bytes before starting the server');
}
if (otpProvider !== 'mock') {
  throw new Error(`Unsupported OTP_PROVIDER: ${otpProvider}`);
}

module.exports = Object.freeze({
  port,
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/mydb',
  jwtSecret,
  otpProvider,
});
