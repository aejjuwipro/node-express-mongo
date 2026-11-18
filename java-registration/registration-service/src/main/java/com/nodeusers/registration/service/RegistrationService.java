package com.nodeusers.registration.service;

import java.util.Locale;
import com.nodeusers.registration.api.AuthResponse;
import com.nodeusers.registration.api.EmailRegistrationAccepted;
import com.nodeusers.registration.api.LoginRequest;
import com.nodeusers.registration.api.RegisterRequest;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.domain.UserAccount;
import com.nodeusers.registration.repository.UserAccountRepository;
import com.nodeusers.registration.security.JwtTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class RegistrationService {
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;
    private final JwtTokenService tokenService;
    private final RegistrationSettings settings;

    public RegistrationService(
        UserAccountRepository users,
        PasswordEncoder passwordEncoder,
        EmailVerificationService emailVerificationService,
        JwtTokenService tokenService,
        RegistrationSettings settings
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
        this.tokenService = tokenService;
        this.settings = settings;
    }

    public EmailRegistrationAccepted register(RegisterRequest request) {
        return emailVerificationService.register(request);
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserAccount user = users.findByEmail(email)
            .filter(account -> account.getPasswordHash() != null
                && passwordEncoder.matches(request.password(), account.getPasswordHash()))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return AuthResponse.from(user, tokenService.create(user));
    }

    public AuthResponse verifyEmail(String email, String code) {
        UserAccount user = emailVerificationService.verify(email, code);
        return AuthResponse.from(user, tokenService.create(user));
    }

    public void requestEmailVerification(String email) {
        emailVerificationService.resend(email);
    }

    public int emailVerificationTtlSeconds() {
        return Math.toIntExact(settings.getOtp().getEmailTtl().toSeconds());
    }
}
