const app = require('./src/app');
const config = require('./src/config/environment');
const { connectDatabase } = require('./src/infrastructure/database');

const startServer = async () => {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error('Application startup failed:', error);
  process.exitCode = 1;
});
