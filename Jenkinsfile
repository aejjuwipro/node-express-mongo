pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY',
            defaultValue: false,
            description: 'Deploy from the main branch to the Ansible inventory configured below.'
        )
        string(
            name: 'ANSIBLE_INVENTORY',
            defaultValue: 'ansible/inventory/production.ini',
            description: 'Untracked inventory file containing the approved deployment host.'
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
                sh 'node ci/smoke-test.mjs'
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
                        keyFileVariable: 'ANSIBLE_PRIVATE_KEY'
                    )
                ]) {
                    sh '''
                        set -eu
                        test -f "$ANSIBLE_INVENTORY"
                        ansible-playbook \
                          -i "$ANSIBLE_INVENTORY" \
                          --private-key "$ANSIBLE_PRIVATE_KEY" \
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
