package com.nodeusers.registration.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.nodeusers.registration.config.RegistrationSettings;
import org.junit.jupiter.api.Test;

class SecretHasherTest {
    @Test
    void challengeCodesAreStoredAsStableKeyedDigests() {
        RegistrationSettings settings = new RegistrationSettings();
        settings.getOtp().setHmacSecret("a-test-secret-long-enough-for-hmac-12345");
        SecretHasher hasher = new SecretHasher(settings);

        String first = hasher.hmac("123456");

        assertThat(first).hasSize(64).isNotEqualTo("123456");
        assertThat(hasher.hmac("123456")).isEqualTo(first);
        assertThat(hasher.hmac("654321")).isNotEqualTo(first);
    }
}
