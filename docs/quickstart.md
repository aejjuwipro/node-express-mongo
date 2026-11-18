# Quickstart

## Prerequisites

- Docker Engine with Docker Compose
- A shell and a text editor
- `openssl` if you want to generate a JWT signing secret

## Configure and start

1. Create a local environment file from the template if one does not already exist:

   ```sh
   if [ ! -f .env ]; then cp .env.example .env; fi
   ```

2. Edit `.env`:
   - Set unique MongoDB and Mongo Express usernames/passwords.
   - Replace `JWT_SECRET` with at least 32 bytes of random data. For example, run `openssl rand -hex 32` and paste its output into `.env`.
   - Keep `OTP_PROVIDER=mock` for local development.
   - Set `DEBUG=true` to emit request debug logs; use `DEBUG=false` to suppress debug-level logs. Debug logging is off by default.
   - Set `OTEL_ENABLED=true` to export traces, metrics, and logs to the local OpenTelemetry stack (enabled by the Compose default).
   - Set `GRAFANA_PASSWORD` to a unique local password before opening Grafana; Compose falls back to `admin` if it is not configured.
   - Keep `SMS_PROVIDER=mock` and `SPRING_PROFILES_ACTIVE=local` for Java mobile OTP development. `OTP_EXPOSE_CODE=true` is a local-only convenience; use `false` outside local development.
   - Set `OTP_HMAC_SECRET` to a distinct random secret for Java challenge digests; do not reuse it across production environments.
   - Leave the Airtel variables blank unless you have an authorized Airtel tenant and have confirmed its API contract.
   - Use URI-safe characters in `MONGO_USER` and `MONGO_PASS`; Compose interpolates them directly into the MongoDB URI.
3. Build and start the services:

   ```sh
   docker compose up -d --build
   ```

4. Confirm service status and startup logs:

   ```sh
   docker compose ps
   docker compose logs --tail=50 app
   ```

   Wait for both `Connected to MongoDB` and `Server running on port 3001` in the app logs.
   `docker compose ps` should show the app, registration service, and API gateway as healthy after their readiness checks succeed.

## URLs and ports

| Service | Host URL / port | Container listener |
| --- | --- | --- |
| Express app | <http://localhost:3001> | `3001` |
| Java API Gateway | <http://localhost:3003> | `8081` |
| Java registration API | Internal only (`registration-service:8080`) | `8080` |
| Login UI | <http://localhost:3001/login> | `3001` |
| Registration UI | <http://localhost:3001/registration> | `3001` |
| Account dashboard (after sign-in) | <http://localhost:3001/dashboard> | `3001` |
| Liveness check | <http://localhost:3001/health/live> | `3001` |
| Readiness check | <http://localhost:3001/health/ready> | `3001` |
| Prometheus metrics | <http://localhost:3001/metrics> | `3001` |
| Grafana dashboards | <http://localhost:3002> | `3000` |
| Prometheus UI | <http://localhost:9090> | `9090` |
| OpenTelemetry Collector OTLP HTTP | Internal Compose service `otel-collector:4318` | `4318` |
| Mailpit email preview | <http://localhost:8025> | `8025` |
| Mongo Express | <http://localhost:8082> | `8081` |
| MongoDB | `localhost:27017` | `27017` |

After signing in, use the dashboard to edit your name, verify a new email/mobile contact, or change your password. Contact verification is mock-only: the code appears in the dashboard and is not sent by email or SMS. Codes expire after five minutes, have a 60-second resend cooldown, and allow five verification attempts. Password changes require the current password and an 8-character minimum; mobile-only accounts continue to sign in with OTP.

Mongo Express uses the `ME_USER` and `ME_PASS` values from `.env`. The application connects to MongoDB by the Compose service name `mongo`; do not change its in-container hostname to `localhost`.

## Java registration and API Gateway

The gateway routes `/auth/**` to the Java service and `/node/**` to the existing Node application after stripping the `/node` prefix. Java-created verified accounts share the MongoDB `users` collection and JWT secret with Node.

Email registration begins with `POST http://localhost:3003/auth/register`; open Mailpit at <http://localhost:8025> to retrieve the verification code, then submit it to `/auth/email/verify`. The Java mobile endpoints are `/auth/mobile/request-otp` and `/auth/mobile/verify-otp`. In the local mock configuration only, the request response includes `delivery.pass`. Never enable mock OTP disclosure outside development.

See the [Java Registration SDLC and architecture](java-registration-sdlc.md) for all endpoints, flows, diagrams, operations, test gates, and Airtel configuration caveats. The Airtel adapter has not been validated against a live tenant API contract.

## OpenTelemetry and Grafana

Compose starts an OpenTelemetry Collector, Prometheus, Grafana, Loki, and Tempo. The Node SDK and Java service send OTLP telemetry to the Collector; Prometheus also scrapes the Java service and gateway Actuator endpoints. Traces go to Tempo, metrics to Prometheus, and logs to Loki. Grafana provisions these data sources plus the **Node Users Overview** and **Java Registration Overview** dashboards.

1. Generate activity by opening the app or making requests to `http://localhost:3001`.
2. Open Grafana at <http://localhost:3002> and sign in with `GRAFANA_USER` and `GRAFANA_PASSWORD` (defaults: `admin`/`admin` for local development). The host uses port 3002 because another local service already occupies port 3000.
3. Open **Dashboards → Node Users → Node Users Overview** for request rate, latency, process memory, and logs.
4. Open **Explore → Tempo** to search recent traces. From a trace, use the configured trace-to-logs link to find correlated Loki logs.
5. Check Prometheus targets at <http://localhost:9090/targets>; `otel-collector`, `registration-service`, and `registration-api-gateway` should be `UP`.

The app's `/metrics` route remains available for compatibility. Prometheus uses the OpenTelemetry Collector's metrics endpoint for the telemetry pipeline. Set `OTEL_ENABLED=false` in `.env` to run the app without exporting telemetry. Local data persists in named Docker volumes. This compose setup is for development: Grafana and Prometheus host ports bind to loopback, while the Collector, Loki, and Tempo are only reachable inside the Docker network.

## Authentication examples

Register with email/password:

```sh
curl -i http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"person@example.test","password":"ReplaceWithARealPassword123","name":"Example User"}'
```

Sign in:

```sh
curl -i http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"person@example.test","password":"ReplaceWithARealPassword123"}'
```

For mobile auth, use an E.164 number such as `+15551234567`:

```sh
curl -i http://localhost:3001/auth/mobile/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"+15551234567"}'
```

With the mock provider, the response includes a six-digit `delivery.pass`. Submit that value to `/auth/mobile/verify-otp` with the same mobile number. It is not an SMS and must not be exposed in a production configuration. OTPs expire after five minutes, have a 60-second resend cooldown, and are limited to five verification attempts.

```sh
curl -i http://localhost:3001/auth/mobile/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"+15551234567","pass":"REPLACE_WITH_delivery.pass"}'
```

Send the returned JWT as `Authorization: Bearer <token>` to `/users/me` or `/auth/me`. The browser UI stores the token in session storage for the current browser session.

## Common operations

```sh
docker compose logs -f app
docker compose restart app
docker compose up -d --build app
docker compose down
```

`docker compose down` preserves the named MongoDB data volume. Avoid deleting that volume unless you intentionally want to erase local database data.

For failure checks and previously corrected configuration errors, see [Milestones and correction log](milestones.md).

## CI with Jenkins

The root [Jenkinsfile](../Jenkinsfile) is the CI entry point. Configure a Jenkins **Multibranch Pipeline** or **Pipeline from SCM** job to load this repository's `Jenkinsfile`. The Jenkins agent must have:

- Node.js 20 or later.
- Docker Engine and Docker Compose v2.24 or later, with access to the daemon.
- For the optional deployment stage only: Ansible and the `ansible.posix` collection.

The pipeline validates Compose and Node syntax, builds the application and Java images (the Java Docker builds run Maven tests), then starts a separate full Compose stack on CI-only loopback ports. Its smoke test checks service health, gateway routes, mobile OTP single-use, Java-issued JWT acceptance by Node, and Prometheus scrape targets. Post-build cleanup removes only the CI project's containers, network, and named volumes.

`ci/compose.env` contains deliberately disposable fixture values. They are not production credentials and must never be copied into `.env` or used for deployment. No cloud account, registry, SMS subscription, or paid CI service is required for these checks. CI does require Docker daemon access, which is equivalent to host-level control; only run trusted pipeline code on a dedicated, access-controlled Jenkins agent.

The `DEPLOY` Jenkins parameter is off by default and only deploys from the `main` branch when explicitly enabled. Configure the `node-users-deploy-key` SSH credential in Jenkins; keep the actual host inventory in the ignored `ansible/inventory/production.ini`. Deployment does not provision cloud infrastructure or publish images to a registry.
