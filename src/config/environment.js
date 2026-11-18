const port = Number(process.env.PORT || 3001);
const jwtSecret = process.env.JWT_SECRET;
const otpProvider = process.env.OTP_PROVIDER || 'mock';
const debugValue = (process.env.DEBUG || 'false').toLowerCase();
const otelEnabledValue = (process.env.OTEL_ENABLED || 'false').toLowerCase();
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a value of at least 32 bytes before starting the server');
}
if (otpProvider !== 'mock') {
  throw new Error(`Unsupported OTP_PROVIDER: ${otpProvider}`);
}
if (debugValue !== 'true' && debugValue !== 'false') {
  throw new Error('DEBUG must be either true or false');
}
if (otelEnabledValue !== 'true' && otelEnabledValue !== 'false') {
  throw new Error('OTEL_ENABLED must be either true or false');
}
try {
  const endpointUrl = new URL(otelEndpoint);
  if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
    throw new Error();
  }
} catch {
  throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT must be a valid HTTP(S) URL');
}

module.exports = Object.freeze({
  port,
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/mydb',
  jwtSecret,
  otpProvider,
  debugEnabled: debugValue === 'true',
  otelEnabled: otelEnabledValue === 'true',
  otelEndpoint: otelEndpoint.replace(/\/+$/, ''),
  serviceName: process.env.OTEL_SERVICE_NAME || 'node-users',
});
