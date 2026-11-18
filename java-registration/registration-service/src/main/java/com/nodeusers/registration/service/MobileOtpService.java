package com.nodeusers.registration.service;

import java.time.Clock;
import java.time.Instant;
import com.nodeusers.registration.api.OtpRequested;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.domain.UserAccount;
import com.nodeusers.registration.notifications.NotificationEvent;
import com.nodeusers.registration.notifications.NotificationPublisher;
import com.nodeusers.registration.notifications.SmsGateway;
import com.nodeusers.registration.repository.UserAccountRepository;
import com.nodeusers.registration.security.OneTimeCodeStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class MobileOtpService {
    private static final Logger logger = LoggerFactory.getLogger(MobileOtpService.class);

    private final UserAccountRepository users;
    private final OneTimeCodeStore codeStore;
    private final NotificationPublisher notifications;
    private final SmsGateway smsGateway;
    private final RegistrationSettings settings;
    private final Clock clock;

    public MobileOtpService(
        UserAccountRepository users,
        OneTimeCodeStore codeStore,
        NotificationPublisher notifications,
        SmsGateway smsGateway,
        RegistrationSettings settings,
        Clock clock
    ) {
        this.users = users;
        this.codeStore = codeStore;
        this.notifications = notifications;
        this.smsGateway = smsGateway;
        this.settings = settings;
        this.clock = clock;
    }

    public OtpRequested request(String mobile) {
        String normalizedMobile = mobile.trim();
        String code = codeStore.generateCode();
        codeStore.issue("sms", normalizedMobile, code, settings.getOtp().getTtl());
        String message = "Your Node Users verification code is %s. It expires in five minutes.".formatted(code);
        try {
            notifications.publish(NotificationEvent.sms(normalizedMobile, message));
            logger.info("Mobile verification notification queued provider={}", smsGateway.providerName());
        } catch (RuntimeException exception) {
            codeStore.clear("sms", normalizedMobile);
            throw exception;
        }

        String pass = settings.getOtp().isExposeCode() ? code : null;
        String warning = pass == null
            ? null
            : "Local mock OTP only: this pass is returned for development and is not sent by SMS.";
        return new OtpRequested(
            normalizedMobile,
            Math.toIntExact(settings.getOtp().getTtl().toSeconds()),
            new OtpRequested.Delivery(smsGateway.providerName(), pass, warning));
    }

    public VerifiedMobile verify(String mobile, String pass) {
        String normalizedMobile = mobile.trim();
        codeStore.verify("sms", normalizedMobile, pass);

        Instant now = clock.instant();
        java.util.Optional<UserAccount> existingUser = users.findByMobile(normalizedMobile);
        boolean created = existingUser.isEmpty();
        UserAccount user = existingUser.orElseGet(() -> new UserAccount(normalizedMobile, now));
        user.setMobile(normalizedMobile);
        user.setMobileVerifiedAt(now);
        user.setUpdatedAt(now);
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }

        try {
            UserAccount saved = users.save(user);
            logger.info("Mobile verification completed");
            return new VerifiedMobile(saved, created);
        } catch (org.springframework.dao.DuplicateKeyException exception) {
            UserAccount existing = users.findByMobile(normalizedMobile)
                .orElseThrow(() -> new ApiException(
                    org.springframework.http.HttpStatus.CONFLICT, "Mobile number is already registered"));
            existing.setMobileVerifiedAt(now);
            existing.setUpdatedAt(now);
            return new VerifiedMobile(users.save(existing), false);
        }
    }

    public record VerifiedMobile(UserAccount user, boolean created) {
    }
}
