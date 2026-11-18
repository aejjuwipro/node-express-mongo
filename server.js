const config = require('./src/config/environment');
const logger = require('./src/utils/logger');
const { startTelemetry } = require('./src/observability/telemetry');

let server;
let telemetry;

const startServer = async () => {
  telemetry = await startTelemetry();
  const app = require('./src/app');
  const { connectDatabase } = require('./src/infrastructure/database');
  await connectDatabase();
  server = app.listen(config.port, () => {
    logger.info('Server started', { port: config.port });
  });
};

const stopServer = async (signal) => {
  logger.info('Server shutdown requested', { signal });
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await require('mongoose').disconnect();
    if (telemetry) await telemetry.shutdown();
  } catch (error) {
    logger.error('Server shutdown failed', { error_type: error.name });
    process.exitCode = 1;
  }
};

process.once('SIGINT', () => stopServer('SIGINT'));
process.once('SIGTERM', () => stopServer('SIGTERM'));

startServer().catch((error) => {
  logger.error('Application startup failed', { error_type: error.name });
  const shutdown = telemetry ? telemetry.shutdown() : Promise.resolve();
  shutdown.finally(() => {
    process.exitCode = 1;
  });
});
