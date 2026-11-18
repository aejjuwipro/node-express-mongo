package com.nodeusers.registration.notifications;

public interface SmsGateway {
    void send(String mobile, String message);

    String providerName();
}
