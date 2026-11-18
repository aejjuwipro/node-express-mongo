package com.nodeusers.registration.config;

import static org.springframework.data.domain.Sort.Direction.ASC;

import com.nodeusers.registration.domain.PendingRegistration;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Component
public class MongoIndexInitializer implements ApplicationRunner {
    private final MongoTemplate mongoTemplate;

    public MongoIndexInitializer(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        mongoTemplate.indexOps("users").ensureIndex(
            new Index().on("email", ASC).unique().sparse().named("email_1"));
        mongoTemplate.indexOps("users").ensureIndex(
            new Index().on("mobile", ASC).unique().sparse().named("mobile_1"));
        mongoTemplate.indexOps(PendingRegistration.class).ensureIndex(
            new Index().on("email", ASC).unique().named("email_1"));
        mongoTemplate.indexOps(PendingRegistration.class).ensureIndex(
            new Index().on("expiresAt", ASC).expire(java.time.Duration.ZERO).named("expiresAt_ttl"));
    }
}
