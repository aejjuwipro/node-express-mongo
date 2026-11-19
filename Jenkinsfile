pipeline {
    agent {
        label 'node-users-ci'
    }

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY',
            defaultValue: false,
            description: 'Deploy from the main branch using the protected Jenkins inventory and SSH credentials.'
        )
    }

    environment {
        CI_PROJECT_NAME = "node-users-ci-${BUILD_NUMBER}"
        CI_NODE_URL = 'http://127.0.0.1:13001'
        CI_GATEWAY_URL = 'http://127.0.0.1:13003'
        CI_PROMETHEUS_URL = 'http://127.0.0.1:19090'
    }

    stages {
        stage('Validate') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file ci/compose.env \
                      -f docker-compose.yml -f ci/docker-compose.ci.yml \
                      --project-name "$CI_PROJECT_NAME" config --quiet
                    node --check server.js
                    find src public -type f -name '*.js' -exec node --check '{}' \\;
                '''
            }
        }

        stage('Build and unit tests') {
            steps {
                sh '''
                    docker compose --env-file ci/compose.env \
                      -f docker-compose.yml -f ci/docker-compose.ci.yml \
                      --project-name "$CI_PROJECT_NAME" \
                      build app registration-service api-gateway
                '''
            }
        }

        stage('Compose integration smoke test') {
            steps {
                sh '''
                    docker compose --env-file ci/compose.env \
                      -f docker-compose.yml -f ci/docker-compose.ci.yml \
                      --project-name "$CI_PROJECT_NAME" up -d
                '''
                sh '''
                    docker compose --env-file ci/compose.env \
                      -f docker-compose.yml -f ci/docker-compose.ci.yml \
                      --project-name "$CI_PROJECT_NAME" \
                      run --rm --no-deps \
                      -e CI_NODE_URL=http://app:3001 \
                      -e CI_GATEWAY_URL=http://api-gateway:8081 \
                      -e CI_PROMETHEUS_URL=http://prometheus:9090 \
                      --entrypoint node app ci/smoke-test.mjs
                '''
            }
        }

        stage('Deploy with Ansible') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOY }
                }
            }
            steps {
                sh 'ansible-galaxy collection install -r ansible/requirements.yml'
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'node-users-deploy-key',
                        keyFileVariable: 'ANSIBLE_PRIVATE_KEY',
                        usernameVariable: 'ANSIBLE_SSH_USER'
                    ),
                    file(
                        credentialsId: 'node-users-production-inventory',
                        variable: 'ANSIBLE_INVENTORY_FILE'
                    )
                ]) {
                    sh '''
                        set -eu
                        test -f "$ANSIBLE_INVENTORY_FILE"
                        ansible-playbook \
                          -i "$ANSIBLE_INVENTORY_FILE" \
                          --private-key "$ANSIBLE_PRIVATE_KEY" \
                          -e "ansible_user=$ANSIBLE_SSH_USER" \
                          ansible/deploy.yml
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker compose --env-file ci/compose.env \
                  -f docker-compose.yml -f ci/docker-compose.ci.yml \
                  --project-name "$CI_PROJECT_NAME" \
                  down --volumes --remove-orphans
            '''
        }
    }
}
