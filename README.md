# Node Users

Node Users is an Express and MongoDB user application with email/password authentication, development-only OTP/contact verification, editable profile names and contacts, authenticated password changes, and browser login and registration pages.

## Start here

1. Follow the [Quickstart](docs/quickstart.md) to configure `.env` and run the Docker services.
2. Open the UI:
   - Login: <http://localhost:3001/login>
   - Registration: <http://localhost:3001/registration>
   - After signing in, the app opens the dashboard at <http://localhost:3001/dashboard>.
3. Read the [milestone history and correction log](docs/milestones.md) before changing previously troublesome configuration.
4. Follow the [project SDLC](docs/project-sdlc.md) for implementation and verification expectations.

## Application structure

- `server.js`: application startup and database connection orchestration.
- `src/config/`: validated process environment.
- `src/infrastructure/`: MongoDB setup and the replaceable OTP delivery client.
- `src/models/`: Mongoose persistence models.
- `src/routes/` and `src/middleware/`: HTTP endpoints and request authentication.
- `src/app.js`: Express middleware, static assets, and route mounting.
- `public/`: browser UI.
- `docker-compose.yml`: local app, MongoDB, and Mongo Express services.
- `observability/`: OpenTelemetry Collector, Prometheus, Loki, Tempo, and Grafana provisioning.

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Register with email and password |
| `POST` | `/auth/login` | Sign in with email and password |
| `POST` | `/auth/mobile/request-otp` | Request a development OTP for an E.164 mobile number |
| `POST` | `/auth/mobile/verify-otp` | Verify an OTP and register/sign in by mobile |
| `GET` | `/auth/me` | Return the authenticated account |
| `GET` | `/users/me` | Read the authenticated profile |
| `PATCH` | `/users/me` | Update the authenticated user's name |
| `PATCH` | `/users/me/password` | Change password after verifying the current password |
| `POST` | `/users/me/contact-verification/request` | Request a mock email/mobile verification code |
| `POST` | `/users/me/contact-verification/verify` | Verify a contact change and update the account |
| `GET` | `/health/live` | Check that the Node process is running |
| `GET` | `/health/ready` | Check that MongoDB is reachable and the app can serve traffic |
| `GET` | `/metrics` | Legacy in-process Prometheus-format metrics; Prometheus scrapes OpenTelemetry metrics from the Collector |

Use `/health/live` for liveness checks and `/health/ready` for readiness checks.

## Monitoring and observability

The Node.js OpenTelemetry SDK auto-instruments HTTP, Express, MongoDB, and runtime activity. Application request metrics and structured application logs also use OpenTelemetry APIs. OTLP signals flow through the Collector:

- Traces -> Tempo
- Metrics -> Prometheus
- Logs -> Loki
- Grafana provides a provisioned **Node Users Overview** dashboard and links traces to corresponding logs.

Open Grafana at <http://localhost:3002> (default local username/password: `admin`/`admin`; set `GRAFANA_USER` and `GRAFANA_PASSWORD` in `.env` to override). Prometheus is available at <http://localhost:9090>. Grafana uses host port 3002 because port 3000 is already allocated by another local service. These monitoring UIs bind to loopback for local development; do not expose them publicly without authentication and network controls. Collector, Loki, and Tempo remain internal to the Compose network.

Set `OTEL_ENABLED=false` in `.env` to disable SDK export from the app. The configured stack uses local filesystem volumes, a 15-day Prometheus retention, seven-day Loki retention, and 48-hour Tempo retention; it is intended for development, not highly available production deployment.

Mobile OTP and contact verification use development mocks: the generated code is returned to the dashboard/API and is not sent by SMS or email. Contact verification codes expire after five minutes, have a 60-second resend cooldown, and are limited to five attempts. Do not use these providers for production. See [Quickstart](docs/quickstart.md) for setup and [Milestones](docs/milestones.md) for known corrections.

## Contributions and changes

Keep application code independent of deployment settings: read environment variables through `src/config/environment.js`, keep persistence and provider integrations under `src/infrastructure/`, and wire HTTP behavior through the app and route modules. Update the milestone/correction documentation when a setup or runtime issue is discovered.
