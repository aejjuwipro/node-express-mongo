const config = require('../config/environment');

const debug = (message, details) => {
  if (config.debugEnabled) {
    console.debug(`[debug] ${message}`, details);
  }
};

module.exports = { debug };
