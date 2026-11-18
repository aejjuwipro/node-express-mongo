package com.nodeusers.registration.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "java_registration_pending")
public class PendingRegistration {
    @Id
    private String id;
    private String email;
    private String name;
    private String passwordHash;
    private Instant createdAt;
    private Instant expiresAt;

    public PendingRegistration() {
    }

    public PendingRegistration(String email, String name, String passwordHash, Instant createdAt, Instant expiresAt) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
