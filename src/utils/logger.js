const { logs, SeverityNumber } = require('@opentelemetry/api');
const config = require('../config/environment');

const otelLogger = logs.getLogger(config.serviceName);
const severity = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

const writeLog = (level, message, details = {}) => {
  const attributes = Object.fromEntries(
    Object.entries(details).filter(([, value]) => (
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    )),
  );
  const record = {
    timestamp: new Date().toISOString(),
    severity: level,
    message,
    ...attributes,
  };

  otelLogger.emit({
    body: message,
    severityNumber: severity[level],
    severityText: level.toUpperCase(),
    attributes,
  });

  const output = `${JSON.stringify(record)}\n`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
};

const debug = (message, details) => {
  if (config.debugEnabled) writeLog('debug', message, details);
};

module.exports = {
  debug,
  error: (message, details) => writeLog('error', message, details),
  info: (message, details) => writeLog('info', message, details),
  warn: (message, details) => writeLog('warn', message, details),
};
