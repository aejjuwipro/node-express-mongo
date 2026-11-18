package com.nodeusers.registration.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import com.nodeusers.registration.api.EmailRegistrationAccepted;
import com.nodeusers.registration.api.RegisterRequest;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.domain.PendingRegistration;
import com.nodeusers.registration.domain.UserAccount;
import com.nodeusers.registration.notifications.NotificationEvent;
import com.nodeusers.registration.notifications.NotificationPublisher;
import com.nodeusers.registration.repository.PendingRegistrationRepository;
import com.nodeusers.registration.repository.UserAccountRepository;
import com.nodeusers.registration.security.OneTimeCodeStore;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {
    private static final Logger logger = LoggerFactory.getLogger(EmailVerificationService.class);

    private final UserAccountRepository users;
    private final PendingRegistrationRepository pendingRegistrations;
    private final PasswordEncoder passwordEncoder;
    private final OneTimeCodeStore codeStore;
    private final NotificationPublisher notifications;
    private final RegistrationSettings settings;
    private final Clock clock;

    public EmailVerificationService(
        UserAccountRepository users,
        PendingRegistrationRepository pendingRegistrations,
        PasswordEncoder passwordEncoder,
        OneTimeCodeStore codeStore,
        NotificationPublisher notifications,
        RegistrationSettings settings,
        Clock clock
    ) {
        this.users = users;
        this.pendingRegistrations = pendingRegistrations;
        this.passwordEncoder = passwordEncoder;
        this.codeStore = codeStore;
        this.notifications = notifications;
        this.settings = settings;
        this.clock = clock;
    }

    public EmailRegistrationAccepted register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.findByEmail(email).isPresent() || pendingRegistrations.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        String name = request.name() == null ? null : request.name().trim();
        if (name != null && name.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name must be between 1 and 80 characters");
        }
        if (request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                "Password must be at least 8 characters and no more than 72 bytes");
        }

        Instant now = clock.instant();
        PendingRegistration pending = new PendingRegistration(
            email,
            name,
            passwordEncoder.encode(request.password()),
            now,
            now.plus(settings.getOtp().getEmailTtl()));
        try {
            pendingRegistrations.save(pending);
        } catch (DuplicateKeyException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        sendVerificationCode(email, name);
        return new EmailRegistrationAccepted(
            email,
            "PENDING_EMAIL_VERIFICATION",
            Math.toIntExact(settings.getOtp().getEmailTtl().toSeconds()));
    }

    public void resend(String requestedEmail) {
        String email = normalizeEmail(requestedEmail);
        PendingRegistration pending = pendingRegistrations.findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pending registration was not found"));
        if (!pending.getExpiresAt().isAfter(clock.instant())) {
            pendingRegistrations.delete(pending);
            codeStore.clear("email", email);
            throw new ApiException(HttpStatus.GONE, "Registration has expired; submit the registration form again");
        }
        sendVerificationCode(email, pending.getName());
    }

    public UserAccount verify(String requestedEmail, String code) {
        String email = normalizeEmail(requestedEmail);
        codeStore.verify("email", email, code);
        PendingRegistration pending = pendingRegistrations.findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Verification code is invalid or expired"));
        if (!pending.getExpiresAt().isAfter(clock.instant())) {
            pendingRegistrations.delete(pending);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Verification code is invalid or expired");
        }
        if (users.findByEmail(email).isPresent()) {
            pendingRegistrations.delete(pending);
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        Instant now = clock.instant();
        UserAccount user = new UserAccount(
            pending.getName(), email, pending.getPasswordHash(), now);
        user.setEmailVerifiedAt(now);
        try {
            UserAccount saved = users.save(user);
            pendingRegistrations.delete(pending);
            logger.info("Email verification completed");
            return saved;
        } catch (DuplicateKeyException exception) {
            pendingRegistrations.delete(pending);
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }

    private void sendVerificationCode(String email, String name) {
        String code = codeStore.generateCode();
        codeStore.issue("email", email, code, settings.getOtp().getEmailTtl());
        String greeting = name == null ? "Hello" : "Hello " + name;
        String body = "%s,\n\nYour email verification code is %s. It expires in 15 minutes."
            .formatted(greeting, code);
        try {
            notifications.publish(NotificationEvent.email(
                email, "Verify your Node Users account", body));
            logger.info("Email verification notification queued");
        } catch (RuntimeException exception) {
            codeStore.clear("email", email);
            throw exception;
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
