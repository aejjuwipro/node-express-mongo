ARG SERVICE_MODULE

FROM maven:3.9.9-eclipse-temurin-21 AS build
ARG SERVICE_MODULE
WORKDIR /workspace

COPY pom.xml .
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY registration-service/pom.xml registration-service/pom.xml
RUN mvn -B -ntp -pl "${SERVICE_MODULE}" -am dependency:go-offline

COPY api-gateway/src api-gateway/src
COPY registration-service/src registration-service/src
RUN mvn -B -ntp -pl "${SERVICE_MODULE}" -am package \
    && cp "${SERVICE_MODULE}"/target/*.jar /workspace/service.jar \
    && mvn -B -ntp org.apache.maven.plugins:maven-dependency-plugin:3.8.1:copy \
       -Dartifact=io.opentelemetry.javaagent:opentelemetry-javaagent:2.14.0 \
       -DoutputDirectory=/workspace/otel

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app
WORKDIR /app
COPY --from=build /workspace/service.jar /app/service.jar
COPY --from=build /workspace/otel/opentelemetry-javaagent-2.14.0.jar /opt/otel/agent.jar
RUN chown -R app:app /app /opt/otel
USER app
EXPOSE 8080 8081
ENTRYPOINT ["java", "-javaagent:/opt/otel/agent.jar", "-jar", "/app/service.jar"]
