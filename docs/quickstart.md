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

The [Jenkinsfile](../Jenkinsfile) contains CI and an opt-in Ansible deployment stage. Jenkins itself is not part of Docker Compose. Use an existing controller or start a local controller as below; its builds must run on a separate, trusted Docker-capable agent. No cloud account, registry, SMS subscription, or paid CI service is required.

### A. Configure Jenkins CI

1. **Open or start a Jenkins controller.** Your current controller is at <http://127.0.0.1:8081/>; go to <http://127.0.0.1:8081/login> and sign in. Skip the startup command if this controller is already running. An unauthenticated request to `/` may return `403`; use the login page rather than treating that response alone as a service outage. To start a new local-only controller instead, create persistent storage and bind its web UI to loopback:

   ```sh
   docker volume create jenkins_home
   docker run -d --name jenkins-controller --restart unless-stopped \
     -p 127.0.0.1:8081:8080 \
     -v jenkins_home:/var/jenkins_home \
     jenkins/jenkins:lts-jdk21
   ```

   Then open <http://127.0.0.1:8081>, retrieve the one-time unlock password with `docker exec jenkins-controller cat /var/jenkins_home/secrets/initialAdminPassword`, and complete the setup wizard. Keep the controller private; terminate TLS and enforce authentication if remote access is needed. This controller image is only the control plane; do not give it the Docker socket.
2. **Install plugins.** Ensure Jenkins has Pipeline and Git. For optional deployment, add Credentials Binding and SSH Credentials. If Jenkins will launch the build agent over SSH, also install SSH Build Agents.
3. **Prepare a dedicated Linux agent.** First check whether an existing node has the required tools and a Docker-visible workspace; do not relabel a shared agent unless its owner approves. Otherwise, in **Manage Jenkins → Nodes → New Node**, create a permanent node, set a remote root directory, set its label to exactly `node-users-ci`, and assign one executor. Launch it using your approved SSH or inbound-agent method; configure the corresponding node credential and verify SSH host keys when using SSH. Install Java 21 for Jenkins Remoting, Node.js 20+, Docker Engine, and Docker Compose v2.24+. For deployment, install Ansible and `rsync` too. The agent’s checkout workspace must be visible to its Docker daemon at the same absolute path because Compose bind-mounts configuration files.
4. **Secure the agent.** Docker daemon access is effectively host-level privilege. Use a dedicated, access-controlled agent, do not expose its Docker socket, and only run trusted repository code. The Jenkins controller and agent may be separate hosts, but the Docker daemon must see the agent workspace path.
5. **Make the repository available.** Push this repository to a Git remote reachable by Jenkins. If it is private, configure a read-only SCM credential in Jenkins, not in the repository.
6. **Create a Multibranch Pipeline job.** Add the repository as the branch source, discover `main`, and set the script path to `Jenkinsfile` at the repository root. Configure a webhook or SCM polling if builds should start automatically when commits arrive.
7. **Run a `main` branch build with `DEPLOY` unchecked.** The pipeline validates Compose and Node syntax, builds Node and Java images (Maven tests run inside the Java builds), and starts an isolated full Compose stack. Smoke checks cover health, gateway routing, OTP single-use, Java-issued JWT acceptance by Node, and Prometheus targets. The `post` cleanup removes only this CI run’s containers, network, and named volumes.
8. **Review the result.** All stages through “Compose integration smoke test” must pass before enabling deployment. CI uses separate loopback ports and project-scoped volumes, so it does not touch the normal development stack.

`ci/compose.env` contains disposable test fixtures only. Never copy these values into a deployment `.env`. The pipeline does not publish images to a registry.

### B. Prepare an Ansible deployment host

The host must already be provisioned; the playbook does not install Docker, create cloud resources, or change firewall rules.

1. Install Docker Engine, Docker Compose v2, and `rsync` on the Linux host.
2. Create a deployment user that can SSH in, run Docker commands, and write to `~/node-users`. Verify the SSH host key out of band and add the verified key to the Jenkins agent’s `known_hosts`; host-key checking remains enabled.
3. Create the remote deployment directory and seed its environment file once. From the repository root, replace `DEPLOY_USER` and `DEPLOY_HOST` with the approved values:

   ```sh
   ssh "$DEPLOY_USER@$DEPLOY_HOST" 'mkdir -p "$HOME/node-users" && chmod 750 "$HOME/node-users"'
   scp .env.example "$DEPLOY_USER@$DEPLOY_HOST:node-users/.env.example"
   ssh "$DEPLOY_USER@$DEPLOY_HOST" \
     'cd "$HOME/node-users" && if [ ! -e .env ]; then cp .env.example .env; fi && chmod 600 .env'
   ssh -t "$DEPLOY_USER@$DEPLOY_HOST" 'vi "$HOME/node-users/.env"'
   ```

   Replace the example MongoDB credentials, `JWT_SECRET`, `OTP_HMAC_SECRET`, and Grafana password with deployment-specific values. Keep values out of shell history and logs. Leave mock OTP exposure off outside local development; configure real notification providers only after their contracts and credentials are validated. Do not overwrite an existing deployment `.env` during upgrades.
4. Review network exposure before deployment. `docker-compose.yml` publishes application and database ports; firewall off MongoDB/Mongo Express and restrict all admin/monitoring interfaces to trusted networks. Use TLS and an approved ingress/reverse proxy before public access.

### C. Configure Jenkins deployment credentials

1. Create a local inventory from the example:

   ```sh
   cp ansible/inventory/hosts.example.ini ansible/inventory/production.ini
   chmod 600 ansible/inventory/production.ini
   ```

2. Edit the host and SSH username in `ansible/inventory/production.ini`. The example address `192.0.2.10` is documentation-only and must be replaced. Do not add a private key or `.env` values to this file. For manual Ansible commands, the inventory's `ansible_user` is used; Jenkins uses the SSH credential's username.
3. In Jenkins Credentials, create:
   - **SSH Username with private key**, ID `node-users-deploy-key`; set the username and key permitted on the host. The pipeline passes this username to Ansible.
   - **Secret file**, ID `node-users-production-inventory`; upload the reviewed `production.ini`.
4. Keep `production.ini` local/ignored for manual use. Scope both Jenkins credentials to the deployment job/folder; the inventory is injected as a temporary credential file and is never committed or expected in a checkout.

### D. Deploy through Jenkins or run Ansible manually

1. Ensure the `main` branch build is green. After the first pipeline run, Jenkins exposes its declared `DEPLOY` parameter in **Build with Parameters**.
2. Start a new `main` branch build and explicitly set the `DEPLOY` parameter to `true`. The stage installs the pinned `ansible.posix` collection and uses the two Jenkins credentials above. With `DEPLOY=false` (the default), no remote changes are made. Jenkins only enables this stage on `main`.
3. Confirm the deploy stage succeeds. It synchronizes source while excluding `.env`, `.env.*`, `.git`, dependencies, and Java build output; checks the existing `.env`; applies mode `0600`; validates Compose; builds/starts the stack; and waits for Node/Gateway health. It does not delete persistent Docker volumes.
4. On the host, verify `docker compose --project-name node-users --env-file .env ps`, `http://localhost:3001/health/ready`, and `http://localhost:3003/actuator/health`. Check the Prometheus targets and Grafana dashboards as described above.

For a manual deployment from a trusted Ansible controller, install Ansible Core in a Python virtual environment (Python 3.11+), install the pinned collection, then:

```sh
python3 -m venv "$HOME/.venvs/node-users-ansible"
. "$HOME/.venvs/node-users-ansible/bin/activate"
python -m pip install 'ansible-core==2.18.6'
ansible-galaxy collection install -r ansible/requirements.yml
ansible app_hosts -i ansible/inventory/production.ini \
  --private-key /secure/path/to/deployment-key -m ping
ansible-playbook --syntax-check \
  -i ansible/inventory/production.ini ansible/deploy.yml
ansible-playbook -i ansible/inventory/production.ini \
  --private-key /secure/path/to/deployment-key ansible/deploy.yml
```

The Ansible controller/agent also needs `rsync`; the remote host needs `rsync` as well. Add the virtual environment's `bin` directory to the Jenkins deployment agent's `PATH` so the pipeline can find `ansible-playbook` and `ansible-galaxy`. The example inventory uses the reserved documentation address `192.0.2.10`; it is not deployable as-is. Store private keys and production `.env` values outside Git and keep the host firewall restrictive. Terraform is not included because no cloud provider, account, budget, or infrastructure target was selected.
