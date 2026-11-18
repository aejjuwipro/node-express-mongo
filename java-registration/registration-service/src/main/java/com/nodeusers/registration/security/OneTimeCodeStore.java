package com.nodeusers.registration.security;

import java.time.Duration;
import java.security.SecureRandom;
import java.util.List;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.service.ApiException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class OneTimeCodeStore {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final StringRedisTemplate redis;
    private final DefaultRedisScript<Long> verifyScript;
    private final SecretHasher hasher;
    private final RegistrationSettings settings;

    public OneTimeCodeStore(
        StringRedisTemplate redis,
        DefaultRedisScript<Long> verifyChallengeScript,
        SecretHasher hasher,
        RegistrationSettings settings
    ) {
        this.redis = redis;
        this.verifyScript = verifyChallengeScript;
        this.hasher = hasher;
        this.settings = settings;
    }

    public String generateCode() {
        return "%06d".formatted(RANDOM.nextInt(1_000_000));
    }

    public void issue(String channel, String destination, String code, Duration ttl) {
        String challengeKey = challengeKey(channel, destination);
        String cooldownKey = challengeKey + ":cooldown";
        Boolean acquired = redis.opsForValue().setIfAbsent(
            cooldownKey, "1", settings.getOtp().getResendCooldown());
        if (!Boolean.TRUE.equals(acquired)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another verification code");
        }

        try {
            redis.opsForValue().set(challengeKey, hasher.hmac(code), ttl);
            redis.opsForValue().set(
                challengeKey + ":attempts",
                "0",
                ttl);
        } catch (RuntimeException exception) {
            redis.delete(List.of(challengeKey, challengeKey + ":attempts", cooldownKey));
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Verification service is temporarily unavailable");
        }
    }

    public void verify(String channel, String destination, String suppliedCode) {
        String challengeKey = challengeKey(channel, destination);
        Long result;
        try {
            result = redis.execute(
                verifyScript,
                List.of(challengeKey, challengeKey + ":attempts"),
                hasher.hmac(suppliedCode),
                Integer.toString(settings.getOtp().getMaxAttempts()));
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Verification service is temporarily unavailable");
        }

        if (result == null || result == -1L || result == 0L) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Verification code is invalid or expired");
        }
        if (result == -2L) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect attempts; request a new code");
        }
    }

    public void clear(String channel, String destination) {
        String key = challengeKey(channel, destination);
        redis.delete(List.of(key, key + ":attempts", key + ":cooldown"));
    }

    private String challengeKey(String channel, String destination) {
        return "registration:challenge:" + channel + ":" + SecretHasher.identifier(destination);
    }
}
