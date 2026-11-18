package com.nodeusers.registration.notifications;

public interface EmailGateway {
    void send(String email, String subject, String message);
}
