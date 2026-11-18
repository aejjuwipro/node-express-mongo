const { NodeSDK } = require('@opentelemetry/sdk-node');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const config = require('../config/environment');

const startTelemetry = async () => {
  if (!config.otelEnabled) {
    return { shutdown: async () => {} };
  }

  const endpoint = config.otelEndpoint;
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': config.serviceName,
      'service.version': require('../../package.json').version,
      'deployment.environment.name': process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: 10000,
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            const pathname = new URL(request.url, 'http://localhost').pathname;
            span.setAttribute('url.path', pathname);
            span.setAttribute('url.query', '');
            span.setAttribute('url.full', `${request.protocol || 'http:'}//${request.headers.host || 'localhost'}${pathname}`);
          },
        },
      }),
    ],
  });

  await sdk.start();
  return { shutdown: () => sdk.shutdown() };
};

module.exports = { startTelemetry };
