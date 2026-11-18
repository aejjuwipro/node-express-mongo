package com.nodeusers.registration.notifications;

import java.time.Instant;
import java.util.UUID;

public record NotificationEvent(
    String eventId,
    String channel,
    String destination,
    String subject,
    String body,
    Instant createdAt
) {
    public static NotificationEvent sms(String destination, String body) {
        return new NotificationEvent(
            UUID.randomUUID().toString(), "sms", destination, null, body, Instant.now());
    }

    public static NotificationEvent email(String destination, String subject, String body) {
        return new NotificationEvent(
            UUID.randomUUID().toString(), "email", destination, subject, body, Instant.now());
    }
}
