package com.nodeusers.registration.security;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Date;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.domain.UserAccount;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenService {
    private final byte[] secret;
    private final Clock clock;

    public JwtTokenService(RegistrationSettings settings, Clock clock) {
        this.secret = settings.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public String create(UserAccount user) {
        Date issuedAt = Date.from(clock.instant());
        Date expiresAt = Date.from(clock.instant().plus(Duration.ofHours(1)));
        return Jwts.builder()
            .subject(user.getId())
            .issuedAt(issuedAt)
            .expiration(expiresAt)
            .signWith(Keys.hmacShaKeyFor(secret), Jwts.SIG.HS256)
            .compact();
    }
}
