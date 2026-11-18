const { metrics } = require('@opentelemetry/api');

const methodLabels = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'CONNECT',
  'TRACE',
]);
const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const requestCounts = new Map();
const requestDurations = new Map();
const meter = metrics.getMeter('node-users');
const httpRequestCounter = meter.createCounter('node_users_http_requests', {
  description: 'Completed HTTP requests, excluding metrics scrapes.',
  unit: '{request}',
});
const httpRequestDuration = meter.createHistogram('node_users_http_request_duration', {
  description: 'HTTP request duration.',
  unit: 's',
});

meter.createObservableGauge('node_users_process_memory_rss', {
  description: 'Resident memory used by the Node.js process.',
  unit: 'By',
}).addCallback((result) => result.observe(process.memoryUsage.rss()));
meter.createObservableGauge('node_users_process_heap_used', {
  description: 'Heap memory used by the Node.js process.',
  unit: 'By',
}).addCallback((result) => result.observe(process.memoryUsage().heapUsed));
meter.createObservableGauge('node_users_process_uptime', {
  description: 'Node.js process uptime.',
  unit: 's',
}).addCallback((result) => result.observe(process.uptime()));

const normalizeMethod = (method) => (methodLabels.has(method) ? method : 'OTHER');

const recordRequest = (method, statusCode, durationSeconds) => {
  const methodLabel = normalizeMethod(method);
  const attributes = { method: methodLabel, status_code: String(statusCode) };
  httpRequestCounter.add(1, attributes);
  httpRequestDuration.record(durationSeconds, attributes);
  const requestKey = `${methodLabel}|${statusCode}`;
  requestCounts.set(requestKey, (requestCounts.get(requestKey) || 0) + 1);

  const histogram = requestDurations.get(methodLabel) || {
    buckets: durationBuckets.map(() => 0),
    count: 0,
    sum: 0,
  };
  durationBuckets.forEach((bucket, index) => {
    if (durationSeconds <= bucket) histogram.buckets[index] += 1;
  });
  histogram.count += 1;
  histogram.sum += durationSeconds;
  requestDurations.set(methodLabel, histogram);
};

const renderMetrics = () => {
  const memory = process.memoryUsage();
  const lines = [
    '# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds.',
    '# TYPE nodejs_process_uptime_seconds gauge',
    `nodejs_process_uptime_seconds ${process.uptime()}`,
    '# HELP nodejs_process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE nodejs_process_resident_memory_bytes gauge',
    `nodejs_process_resident_memory_bytes ${memory.rss}`,
    '# HELP nodejs_heap_used_bytes Heap memory currently used in bytes.',
    '# TYPE nodejs_heap_used_bytes gauge',
    `nodejs_heap_used_bytes ${memory.heapUsed}`,
    '# HELP http_requests_total Total completed HTTP requests, excluding metrics scrapes.',
    '# TYPE http_requests_total counter',
  ];

  [...requestCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, count]) => {
      const [method, statusCode] = key.split('|');
      lines.push(`http_requests_total{method="${method}",status_code="${statusCode}"} ${count}`);
    });

  lines.push(
    '# HELP http_request_duration_seconds HTTP request duration in seconds.',
    '# TYPE http_request_duration_seconds histogram',
  );
  [...requestDurations.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([method, histogram]) => {
      durationBuckets.forEach((bucket, index) => {
        lines.push(
          `http_request_duration_seconds_bucket{method="${method}",le="${bucket}"} ${histogram.buckets[index]}`,
        );
      });
      lines.push(
        `http_request_duration_seconds_bucket{method="${method}",le="+Inf"} ${histogram.count}`,
        `http_request_duration_seconds_sum{method="${method}"} ${histogram.sum}`,
        `http_request_duration_seconds_count{method="${method}"} ${histogram.count}`,
      );
    });

  return `${lines.join('\n')}\n`;
};

module.exports = { recordRequest, renderMetrics };
