package com.nodeusers.registration.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class ApplicationConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    DefaultRedisScript<Long> verifyChallengeScript() {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setScriptText("""
            local stored = redis.call('GET', KEYS[1])
            if not stored then return -1 end
            local attempts = tonumber(redis.call('GET', KEYS[2]) or '0')
            local maxAttempts = tonumber(ARGV[2])
            if attempts >= maxAttempts then return -2 end
            if stored == ARGV[1] then
              redis.call('DEL', KEYS[1], KEYS[2])
              return 1
            end
            attempts = redis.call('INCR', KEYS[2])
            if attempts >= maxAttempts then return -2 end
            return 0
            """);
        script.setResultType(Long.class);
        return script;
    }
}
