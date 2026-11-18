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

### OTP behavior

- **Correction:** The OTP mock accepts E.164 numbers, returns its development pass, stores only a keyed hash, expires challenges after five minutes, enforces a 60-second resend cooldown and five attempts, and consumes successful challenges.
- **Do not repeat:** The returned pass is intentionally for development only. Do not expose it when implementing a real SMS gateway; the UI warning and response warning must remain consistent with the provider.

### Startup and database indexes

- **Correction:** The server connects to MongoDB and prepares required indexes before listening. The user email index is migrated from the earlier non-sparse unique form so mobile-only accounts can be stored.
- **Do not repeat:** A live TCP port alone is not proof of readiness. Check the app logs for both MongoDB connection and server listener messages. Preserve existing user data when changing indexes; do not drop the MongoDB volume as a workaround.

## Expected status checks

- `GET /`, `GET /login`, and `GET /registration` should return `200`.
- `GET /auth/me` without a bearer token should return `401`; that is expected authorization behavior, not a port failure.
- `GET /users/me` requires `Authorization: Bearer <token>`.
- Mongo Express is protected by its configured basic-auth credentials; an unauthenticated response is not evidence that the container port is wrong.
