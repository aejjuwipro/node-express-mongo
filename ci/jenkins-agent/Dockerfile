FROM node:22-bookworm-slim AS node

FROM docker:29-cli AS docker
ARG COMPOSE_VERSION=v2.39.1
RUN apk add --no-cache curl \
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl --fail --silent --show-error --location \
      "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
      --output /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

FROM jenkins/inbound-agent:jdk21

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git python3 python3-venv rsync \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/ansible \
    && /opt/ansible/bin/pip install --no-cache-dir ansible-core==2.18.6 \
    && ln -s /opt/ansible/bin/ansible-playbook /usr/local/bin/ansible-playbook \
    && ln -s /opt/ansible/bin/ansible-galaxy /usr/local/bin/ansible-galaxy

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=docker /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

USER jenkins
