package com.nodeusers.registration.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "mock", matchIfMissing = true)
public class MockSmsGateway implements SmsGateway {
    private static final Logger logger = LoggerFactory.getLogger(MockSmsGateway.class);

    @Override
    public void send(String mobile, String message) {
        logger.info("Mock SMS accepted for mobile ending in {}", mobile.substring(Math.max(0, mobile.length() - 2)));
    }

    @Override
    public String providerName() {
        return "mock";
    }
}
