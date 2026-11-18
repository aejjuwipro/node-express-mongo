package com.nodeusers.registration.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import com.nodeusers.registration.config.RegistrationSettings;
import org.springframework.stereotype.Component;

@Component
public class SecretHasher {
    private final byte[] key;

    public SecretHasher(RegistrationSettings settings) {
        String secret = settings.getOtp().getHmacSecret();
        if (secret == null || secret.isBlank()) {
            secret = settings.getJwt().getSecret();
        }
        this.key = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to hash a verification challenge", exception);
        }
    }

    public static String identifier(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
