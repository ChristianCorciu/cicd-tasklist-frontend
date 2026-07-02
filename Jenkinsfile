pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        SONAR_TOKEN            = credentials('sonar-token')
        IMAGE_NAME              = "brbrbr9314/tasklist-frontend"
        IMAGE_TAG                = "${env.BUILD_NUMBER}"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'npx sonar-scanner -Dsonar.login=$SONAR_TOKEN'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build (Vite)') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$IMAGE_TAG -t $IMAGE_NAME:latest .'
            }
        }

        stage('Trivy scan (image)') {
            steps {
                sh '''
                    trivy image --exit-code 0 --severity HIGH,CRITICAL \
                        --format table $IMAGE_NAME:$IMAGE_TAG | tee trivy-report.txt
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM (SPDX)') {
            steps {
                sh 'trivy image --format spdx-json --output sbom-spdx.json $IMAGE_NAME:$IMAGE_TAG'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh '''
                    echo "$DOCKERHUB_CREDENTIALS_PSW" | docker login -u "$DOCKERHUB_CREDENTIALS_USR" --password-stdin
                    docker push $IMAGE_NAME:$IMAGE_TAG
                    docker push $IMAGE_NAME:latest
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
    }
}
