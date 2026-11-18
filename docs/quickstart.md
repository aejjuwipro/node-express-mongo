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
   `docker compose ps` should show the app as `healthy` after its readiness check succeeds.

## URLs and ports

| Service | Host URL / port | Container listener |
| --- | --- | --- |
| Express app | <http://localhost:3001> | `3001` |
| Login UI | <http://localhost:3001/login> | `3001` |
| Registration UI | <http://localhost:3001/registration> | `3001` |
| Account dashboard (after sign-in) | <http://localhost:3001/dashboard> | `3001` |
| Liveness check | <http://localhost:3001/health/live> | `3001` |
| Readiness check | <http://localhost:3001/health/ready> | `3001` |
| Prometheus metrics | <http://localhost:3001/metrics> | `3001` |
| Grafana dashboards | <http://localhost:3002> | `3000` |
| Prometheus UI | <http://localhost:9090> | `9090` |
| OpenTelemetry Collector OTLP HTTP | Internal Compose service `otel-collector:4318` | `4318` |
| Mongo Express | <http://localhost:8082> | `8081` |
| MongoDB | `localhost:27017` | `27017` |

After signing in, use the dashboard to edit your name, verify a new email/mobile contact, or change your password. Contact verification is mock-only: the code appears in the dashboard and is not sent by email or SMS. Codes expire after five minutes, have a 60-second resend cooldown, and allow five verification attempts. Password changes require the current password and an 8-character minimum; mobile-only accounts continue to sign in with OTP.

Mongo Express uses the `ME_USER` and `ME_PASS` values from `.env`. The application connects to MongoDB by the Compose service name `mongo`; do not change its in-container hostname to `localhost`.

## OpenTelemetry and Grafana

Compose starts an OpenTelemetry Collector, Prometheus, Grafana, Loki, and Tempo. The Node SDK sends OTLP traces, metrics, and logs to the Collector; it exports traces to Tempo, metrics for Prometheus to scrape, and logs to Loki. Grafana provisions these data sources and the **Node Users Overview** dashboard automatically.

1. Generate activity by opening the app or making requests to `http://localhost:3001`.
2. Open Grafana at <http://localhost:3002> and sign in with `GRAFANA_USER` and `GRAFANA_PASSWORD` (defaults: `admin`/`admin` for local development). The host uses port 3002 because another local service already occupies port 3000.
3. Open **Dashboards → Node Users → Node Users Overview** for request rate, latency, process memory, and logs.
4. Open **Explore → Tempo** to search recent traces. From a trace, use the configured trace-to-logs link to find correlated Loki logs.
5. Check Prometheus targets at <http://localhost:9090/targets>; the `otel-collector` target should be `UP`.

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
