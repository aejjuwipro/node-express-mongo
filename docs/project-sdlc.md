# Project SDLC

This document defines the lightweight development lifecycle for this repository. It reflects the current Docker-based Node.js and Java project and does not assume a CI pipeline is configured. The Java service's detailed architecture, API contracts, diagrams, provider caveats, and operations are documented in [Java Registration SDLC and architecture](java-registration-sdlc.md).

## 1. Scope and requirements

- Record the user-visible behavior and API changes for a milestone.
- Preserve existing email authentication, mobile OTP behavior, browser routes, and Docker ports unless the change explicitly requires otherwise.
- Add/update the [milestone and correction log](milestones.md) when a milestone changes behavior or addresses a recurring setup issue.

## 2. Design

- Keep process/environment configuration in `src/config/`.
- Keep database connections and external-provider adapters in `src/infrastructure/`.
- Keep persistence schemas in `src/models/`.
- Keep HTTP routes and request middleware in `src/routes/` and `src/middleware/`.
- Keep Express setup in `src/app.js`; keep `server.js` limited to startup orchestration.
- Keep static browser files under `public/`.
- Keep Java registration modules under `java-registration/`; separate gateway routing, API/controller, business service, persistence, security, and notification adapter responsibilities.
- Treat the shared Mongo `users` collection and JWT secret as a cross-service contract; review Node compatibility when either changes.
- Keep Java verification codes HMAC-hashed in Redis and notification delivery asynchronous through Kafka. Do not log codes or message bodies.
- Do not describe the configurable Airtel adapter as production-verified until it passes tests against the actual tenant contract.
- Do not commit `.env`, credentials, generated OTPs, or other secrets.

## 3. Implementation

- Validate environment variables at startup and report configuration errors explicitly.
- Preserve API status codes and response shapes when refactoring.
- Keep the OTP mock clearly marked as development-only. A real SMS provider must be introduced as an infrastructure adapter and must not return OTP values to clients.
- Update `package.json` and `package-lock.json` together when direct dependencies change.
- Use small, milestone-focused commits with a clear message.

## 4. Verification gates

Before calling a code milestone complete:

1. Syntax-check changed JavaScript:

   ```sh
   node --check server.js
   find src public -type f -name '*.js' -exec node --check '{}' \;
   ```

2. Validate Compose configuration:

   ```sh
   docker compose config --quiet
   ```

3. Rebuild and run the app:

   ```sh
   docker compose up -d --build
   docker compose ps
   docker compose logs --tail=50 app
   ```

4. Smoke-test `/`, `/login`, `/registration`, and the changed API routes on port `3001`.
5. For authentication changes, verify both success and failure cases, including invalid input, OTP replay/expiry behavior, and authenticated profile access.
6. Confirm the working tree contains no `.env` or other secrets before committing.

For Java changes, also rebuild both modules (`docker compose up -d --build registration-service api-gateway`), check their health and Prometheus targets, and test the relevant registration/verification flow. The Docker build executes Maven tests.

Documentation-only changes do not require a Docker rebuild. Update the quickstart and correction log whenever setup steps or known failure modes change.

## 5. Release and operations

- The local release artifact is the Compose-built `node-express-mongo-app` image.
- Confirm that MongoDB is reachable and the app reports its listener before considering the service ready.
- Do not interpret an unauthenticated `401` from `/auth/me` or Mongo Express as a connectivity failure; verify the expected authenticated flow separately.
- The Compose database volume is persistent. Treat volume deletion as a destructive data operation.

## 6. Follow-up work

- Replace the mock OTP adapter with a real SMS gateway before production deployment.
- Add production hardening (rate limiting, secure token/session policy, TLS, least-privilege network exposure, and operational health checks) before exposing the service publicly.
- Validate the Airtel tenant API/authentication/payload mapping and secure Kafka/Redis before production use.
- Add automated tests/CI when the project adopts a test runner and pipeline.
