# Milestones and correction log

This log records the implemented milestones, their commits, and fixes that should not be repeated in later work.

## Milestones

| Commit | Milestone | Outcome |
| --- | --- | --- |
| `e6bf414` | Email registration and login | Added bcrypt password hashing, JWT auth, Mongo-backed users, and auth endpoints. |
| `6af2fab` | Docker service accessibility | Corrected the Mongo Express host-to-container port mapping. A local JWT secret was generated for the running environment. |
| `ed43277` | Mobile OTP and profile management | Added mock OTP registration/login, OTP attempt/expiry/cooldown controls, and authenticated profile read/update. |
| `cfd233d` | Browser login and registration | Added `/login` and `/registration`, shared styling/client code, and email/mobile forms. |
| `b40106a` | Application/infrastructure separation | Split startup, configuration, infrastructure, models, middleware, routes, and Express app wiring. |
| `254674f` | Fresh MongoDB startup and verification persistence | Create the user collection before index migration and prepare expiring contact verification storage. |
| `585bdce` | Configurable debug logging and observability | Add the `DEBUG` switch, Prometheus metrics, health endpoints, and Docker readiness checks. |
| `471d59e` | Dashboard account and contact management | Redirect after authentication; allow profile and password updates plus verified email/mobile changes. |
| `2f40bc0` | OpenTelemetry and Grafana stack | Export Node.js traces, metrics, and logs through an OpenTelemetry Collector to Tempo, Prometheus, and Loki; provision Grafana dashboards and data sources. |
| `530bd64` | Java registration microservice and API Gateway | Add email/mobile registration, Redis HMAC challenges, Kafka notification delivery, Mailpit, configurable SMS adapter, Java observability, and architecture/SDLC documentation. |
| `24c2617` | Jenkins CI pipeline | Validate Compose and Node source, build/test Node and Java images, then smoke-test an isolated full stack, OTP replay protection, shared JWT interoperability, and Prometheus. |
| `b609c6b` | Ansible host deployment | Synchronize source without secrets, validate remote Compose configuration, build/start the full stack, and verify Node/Gateway readiness while preserving data volumes. |
| `921bcfa` | Jenkins/Ansible quickstart procedures | Document controller/agent setup, CI runs, remote-host preparation, Jenkins secret credentials, manual Ansible deployment, and the protected inventory flow. |

## Corrections to retain

### Environment and secrets

- **Failure:** The app exited/restarted because `JWT_SECRET` was missing after auth was introduced.
- **Correction:** Set a local secret of at least 32 bytes in `.env`; Compose forwards it to the app and `src/config/environment.js` validates it.
- **Do not repeat:** Never commit `.env` or paste secret values into logs/docs. Start from `.env.example`, replace its placeholder secret, and check `git status` before committing.

### Dependency installation

- **Failure:** Installing dependencies directly into the host `node_modules` failed with `EACCES` because that directory was not writable by the current user.
- **Correction:** The image build successfully installed the dependencies; lockfile-only updates were used for lockfile generation.
- **Do not repeat:** Do not change ownership or permissions of the existing `node_modules` directory as a shortcut. Use the Docker build for the container runtime, and only install on the host if the local dependency directory is writable and host execution is needed.

### Docker port mapping

- **Failure:** Mongo Express listened on container port `8081`, while Compose originally published host `8082` to container `8082`; the UI could not be reached correctly.
- **Correction:** Compose now maps `8082:8081`.
- **Do not repeat:** In `ports`, the left side is the host port and the right side must match the service's actual in-container listener. Keep app `3001:3001`; Mongo Express is `8082:8081`.
- MongoDB's host mapping remains `27017:27017`. The app uses the Compose hostname `mongo`, not `localhost`, for container-to-container access.

### UI routing and static assets

- **Failure:** The API worked, but `/login` and `/registration` had no corresponding browser pages.
- **Correction:** Express now serves the HTML routes and static files from `public/`.
- **Do not repeat:** When adding a page, verify its exact route, assets, and HTTP content type on the host port `3001`; an API health response at `/` does not prove that UI routes work.
- Successful email registration/login and mobile OTP sign-in redirect to `/dashboard`. The dashboard requires the browser-session token and returns users without one to `/login`.

### OTP behavior

- **Correction:** The OTP mock accepts E.164 numbers, returns its development pass, stores only a keyed hash, expires challenges after five minutes, enforces a 60-second resend cooldown and five attempts, and consumes successful challenges.
- **Do not repeat:** The returned pass is intentionally for development only. Do not expose it when implementing a real SMS gateway; the UI warning and response warning must remain consistent with the provider.
- Authenticated email/mobile changes use separate, hashed, expiring contact-verification challenges. Existing contact values remain unchanged until the new contact is verified. Challenges are single-use, expire after five minutes, enforce a 60-second resend cooldown and five attempts, and reject contacts owned by another account.
- Both contact delivery channels are currently mock-only; the dashboard displays the code and no email/SMS is sent. Replace the mock delivery service before using contact verification in production.
- Password changes require the current password and enforce the same 8-character minimum and 72-byte maximum as registration.

### Debugging and observability

- Set `DEBUG=true` in `.env` to log HTTP method, path, status, and duration; `DEBUG=false` disables these logs. The default is off, and request bodies/headers are not logged.
- `/health/live` checks process liveness, `/health/ready` checks MongoDB reachability, and `/metrics` exposes Prometheus-format request and process metrics.
- Compose marks the app healthy using `/health/ready`. Metrics are in-memory and reset on process restart; restrict the unauthenticated metrics endpoint to a trusted network.
- OpenTelemetry exports spans/metrics/logs by OTLP to the Collector. Prometheus scrapes Collector metrics, Tempo stores traces, Loki stores logs, and Grafana provisions the three data sources and the Node Users dashboard.
- For local Compose, Grafana listens on `127.0.0.1:3002` (host port 3000 was already occupied), Prometheus on `127.0.0.1:9090`; Collector, Loki, and Tempo are internal-only. Change the Grafana default credentials before use outside a local trusted environment.
- **Failure:** Application logs appeared in container stdout but Loki had no records because the app used the separate `@opentelemetry/api-logs` global API instead of the API package used by the SDK.
- **Correction:** Import `logs` and `SeverityNumber` from `@opentelemetry/api`, configure `BatchLogRecordProcessor` with its exporter option, then confirm Loki entries include trace IDs that resolve in Tempo.
- **Do not repeat:** Seeing stdout logs does not prove OTLP log export is working; verify records in Loki and trace/log correlation end to end.

### Java registration and provider integration

- The Java service is routed through host port `3003`; `/auth/**` goes to Java and `/node/**` reaches Node after stripping the prefix. Node remains on `3001`.
- Java shares MongoDB `users` and the JWT signing secret with Node. Pending email registrations are isolated in `java_registration_pending` until verified.
- Redis stores keyed challenge digests with expiry, cooldown, and attempt controls; Kafka transports email/SMS delivery events with retries and a dead-letter topic.
- Local SMS is a mock provider and local email is captured by Mailpit (`8025`). Mock verification code disclosure must remain development-only.
- The Airtel adapter is configuration-driven, but no real tenant contract was available for validation. A passing mock HTTP test proves only the configured request mapping, not live Airtel API compatibility.
- Java observability uses the existing Collector, Prometheus, Tempo, Loki, and Grafana stack. The `registration-service` and `registration-api-gateway` scrape targets should both be `UP`.

### Startup and database indexes

- **Correction:** The server connects to MongoDB and prepares required indexes before listening. The user email index is migrated from the earlier non-sparse unique form so mobile-only accounts can be stored.
- **Failure:** On a fresh database, startup failed with `NamespaceNotFound` while reading indexes because MongoDB had not created the `users` collection yet.
- **Correction:** Check for the collection and create it before inspecting or migrating its indexes. Index creation and the server listener can then proceed on an empty database.
- **Do not repeat:** A live TCP port alone is not proof of readiness. Check the app logs for both MongoDB connection and server listener messages. Preserve existing user data when changing indexes; do not drop the MongoDB volume as a workaround.

## Expected status checks

- `GET /`, `GET /login`, and `GET /registration` should return `200`.
- `GET /dashboard`, `/health/live`, and `/health/ready` should return `200` when the app is ready; `/metrics` should return Prometheus text.
- In Compose, the Prometheus `otel-collector` target should be `UP`; generated traces and logs should appear in Tempo and Loki, respectively.
- `GET /auth/me` without a bearer token should return `401`; that is expected authorization behavior, not a port failure.
- `/users/me` and its profile, password, and contact-verification actions require `Authorization: Bearer <token>`.
- Mongo Express is protected by its configured basic-auth credentials; an unauthenticated response is not evidence that the container port is wrong.
