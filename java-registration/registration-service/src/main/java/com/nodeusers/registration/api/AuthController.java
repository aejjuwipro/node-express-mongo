package com.nodeusers.registration.api;

import com.nodeusers.registration.service.MobileOtpService;
import com.nodeusers.registration.service.RegistrationService;
import com.nodeusers.registration.security.JwtTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final RegistrationService registrationService;
    private final MobileOtpService mobileOtpService;
    private final JwtTokenService tokenService;

    public AuthController(
        RegistrationService registrationService,
        MobileOtpService mobileOtpService,
        JwtTokenService tokenService
    ) {
        this.registrationService = registrationService;
        this.mobileOtpService = mobileOtpService;
        this.tokenService = tokenService;
    }

    @PostMapping("/register")
    public ResponseEntity<EmailRegistrationAccepted> register(@Valid @RequestBody RegisterRequest request) {
        EmailRegistrationAccepted accepted = registrationService.register(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(accepted);
    }

    @PostMapping("/email/request-verification")
    public ResponseEntity<EmailRegistrationAccepted> requestEmailVerification(
        @Valid @RequestBody EmailAddressRequest request
    ) {
        registrationService.requestEmailVerification(request.email());
        return ResponseEntity.accepted().body(new EmailRegistrationAccepted(
            request.email().trim().toLowerCase(java.util.Locale.ROOT),
            "PENDING_EMAIL_VERIFICATION",
            registrationService.emailVerificationTtlSeconds()));
    }

    @PostMapping("/email/verify")
    public AuthResponse verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        return registrationService.verifyEmail(request.email(), request.code());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return registrationService.login(request);
    }

    @PostMapping("/mobile/request-otp")
    public OtpRequested requestMobileOtp(@Valid @RequestBody MobileOtpRequest request) {
        return mobileOtpService.request(request.mobile());
    }

    @PostMapping("/mobile/verify-otp")
    public ResponseEntity<AuthResponse> verifyMobileOtp(@Valid @RequestBody MobileOtpVerifyRequest request) {
        MobileOtpService.VerifiedMobile verified = mobileOtpService.verify(request.mobile(), request.pass());
        return ResponseEntity.status(verified.created() ? HttpStatus.CREATED : HttpStatus.OK)
            .body(AuthResponse.from(verified.user(), tokenService.create(verified.user())));
    }
}
