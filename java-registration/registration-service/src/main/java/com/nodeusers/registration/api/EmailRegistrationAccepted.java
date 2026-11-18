package com.nodeusers.registration.api;

public record EmailRegistrationAccepted(
    String email,
    String status,
    int expiresInSeconds
) {
}
