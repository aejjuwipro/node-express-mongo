const nodeUrl = process.env.CI_NODE_URL ?? 'http://127.0.0.1:13001';
const gatewayUrl = process.env.CI_GATEWAY_URL ?? 'http://127.0.0.1:13003';
const prometheusUrl = process.env.CI_PROMETHEUS_URL ?? 'http://127.0.0.1:19090';

async function waitFor(label, check, attempts = 90) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (await check()) {
        return;
      }
    } catch {
      // The service may still be starting; the bounded retry reports failure below.
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`${label} did not become ready before the timeout`);
}

async function jsonResponse(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { response, body };
}

await waitFor('Node readiness', async () => {
  const response = await fetch(`${nodeUrl}/health/ready`);
  return response.status === 200;
});

await waitFor('Gateway health', async () => {
  const response = await fetch(`${gatewayUrl}/actuator/health`);
  return response.status === 200;
});

const nodeViaGateway = await fetch(`${gatewayUrl}/node/health/live`);
if (nodeViaGateway.status !== 200) {
  throw new Error(`Node gateway route returned HTTP ${nodeViaGateway.status}`);
}

const invalidRequest = await fetch(`${gatewayUrl}/auth/mobile/request-otp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mobile: 'invalid' }),
});
if (invalidRequest.status !== 400) {
  throw new Error(`Java validation route returned HTTP ${invalidRequest.status}, expected 400`);
}

const mobile = `+1555${String(Date.now()).slice(-7)}`;
const requestOtp = await jsonResponse(`${gatewayUrl}/auth/mobile/request-otp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mobile }),
});
if (requestOtp.response.status !== 200 || !/^\d{6}$/.test(requestOtp.body.delivery?.pass ?? '')) {
  throw new Error(`Local mock OTP request failed with HTTP ${requestOtp.response.status}`);
}

const verifyOtp = await jsonResponse(`${gatewayUrl}/auth/mobile/verify-otp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mobile, pass: requestOtp.body.delivery.pass }),
});
if (verifyOtp.response.status !== 201 || typeof verifyOtp.body.token !== 'string') {
  throw new Error(`Java mobile registration failed with HTTP ${verifyOtp.response.status}`);
}

const replay = await fetch(`${gatewayUrl}/auth/mobile/verify-otp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mobile, pass: requestOtp.body.delivery.pass }),
});
if (replay.status !== 401) {
  throw new Error(`OTP replay returned HTTP ${replay.status}, expected 401`);
}

const nodeSession = await jsonResponse(`${gatewayUrl}/node/auth/me`, {
  headers: { authorization: `Bearer ${verifyOtp.body.token}` },
});
if (nodeSession.response.status !== 200) {
  throw new Error(`Node rejected Java-issued JWT with HTTP ${nodeSession.response.status}`);
}

await waitFor('Java Prometheus targets', async () => {
  const { response, body } = await jsonResponse(`${prometheusUrl}/api/v1/targets`);
  if (!response.ok) {
    return false;
  }

  const healthyJobs = new Set(
    body.data.activeTargets
      .filter((target) => target.health === 'up')
      .map((target) => target.labels.job),
  );
  return ['registration-service', 'registration-api-gateway'].every((job) => healthyJobs.has(job));
});

console.log('Compose smoke test passed: health, routes, OTP single-use, Java-to-Node JWT, and Prometheus targets.');
