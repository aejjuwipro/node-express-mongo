package com.nodeusers.registration.api;

public record OtpRequested(
    String mobile,
    int expiresInSeconds,
    Delivery delivery
) {
    public record Delivery(String provider, String pass, String warning) {
    }
}
