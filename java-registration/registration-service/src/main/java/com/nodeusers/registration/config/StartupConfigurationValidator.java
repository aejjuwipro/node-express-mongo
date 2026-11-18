package com.nodeusers.registration.config;

import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.util.Arrays;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupConfigurationValidator implements ApplicationRunner {
    private final RegistrationSettings settings;
    private final Environment environment;

    public StartupConfigurationValidator(RegistrationSettings settings, Environment environment) {
        this.settings = settings;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        requireSecret(settings.getJwt().getSecret(), "JWT_SECRET");
        String challengeSecret = settings.getOtp().getHmacSecret();
        if (challengeSecret == null || challengeSecret.isBlank()) {
            challengeSecret = settings.getJwt().getSecret();
        }
        requireSecret(challengeSecret, "OTP_HMAC_SECRET or JWT_SECRET");

        String provider = settings.getSms().getProvider();
        if (!"mock".equals(provider) && !"airtel".equals(provider)) {
            throw new IllegalStateException("SMS_PROVIDER must be mock or airtel");
        }

        if (settings.getOtp().isExposeCode()) {
            boolean localProfile = Arrays.asList(environment.getActiveProfiles()).contains("local");
            if (!localProfile || !"mock".equals(provider)) {
                throw new IllegalStateException("OTP_EXPOSE_CODE is allowed only with the local profile and mock SMS provider");
            }
        }

        if ("airtel".equals(provider)) {
            validateAirtelSettings();
        }
    }

    private void requireSecret(String value, String name) {
        if (value == null || value.isBlank()
            || value.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(name + " must contain at least 32 bytes");
        }
    }

    private void validateAirtelSettings() {
        try {
            URI uri = URI.create(settings.getSms().getAirtelApiUrl());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                throw new IllegalStateException("AIRTEL_SMS_API_URL must be an HTTPS URL");
            }
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new IllegalStateException("AIRTEL_SMS_API_URL must be an HTTPS URL");
        }

        requireValue(settings.getSms().getAirtelAuthValue(), "AIRTEL_SMS_AUTH_VALUE");
        requireValue(settings.getSms().getAirtelCustomerId(), "AIRTEL_SMS_CUSTOMER_ID");
        requireValue(settings.getSms().getAirtelSenderId(), "AIRTEL_SMS_SENDER_ID");
        requireValue(settings.getSms().getAirtelTemplateId(), "AIRTEL_SMS_TEMPLATE_ID");
    }

    private void requireValue(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required when SMS_PROVIDER=airtel");
        }
    }
}
