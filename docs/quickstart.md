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

## URLs and ports

| Service | Host URL / port | Container listener |
| --- | --- | --- |
| Express app | <http://localhost:3001> | `3001` |
| Login UI | <http://localhost:3001/login> | `3001` |
| Registration UI | <http://localhost:3001/registration> | `3001` |
| Mongo Express | <http://localhost:8082> | `8081` |
| MongoDB | `localhost:27017` | `27017` |

Mongo Express uses the `ME_USER` and `ME_PASS` values from `.env`. The application connects to MongoDB by the Compose service name `mongo`; do not change its in-container hostname to `localhost`.

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
