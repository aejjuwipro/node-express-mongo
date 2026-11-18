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
| `GET` | `/metrics` | Prometheus-format HTTP request and Node.js process metrics |

Use `/health/live` for liveness checks and `/health/ready` for readiness checks. Prometheus can scrape `/metrics` for HTTP request counts/latency and process uptime/memory. Metrics are process-local and reset on restart; keep the unauthenticated metrics endpoint on a trusted network.

Mobile OTP and contact verification use development mocks: the generated code is returned to the dashboard/API and is not sent by SMS or email. Contact verification codes expire after five minutes, have a 60-second resend cooldown, and are limited to five attempts. Do not use these providers for production. See [Quickstart](docs/quickstart.md) for setup and [Milestones](docs/milestones.md) for known corrections.

## Contributions and changes

Keep application code independent of deployment settings: read environment variables through `src/config/environment.js`, keep persistence and provider integrations under `src/infrastructure/`, and wire HTTP behavior through the app and route modules. Update the milestone/correction documentation when a setup or runtime issue is discovered.
