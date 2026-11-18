package com.nodeusers.registration.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nodeusers.registration.domain.UserAccount;
import com.nodeusers.registration.security.JwtTokenService;
import com.nodeusers.registration.service.MobileOtpService;
import com.nodeusers.registration.service.RegistrationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
class AuthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RegistrationService registrationService;

    @MockBean
    private MobileOtpService mobileOtpService;

    @MockBean
    private JwtTokenService tokenService;

    @Test
    void emailRegistrationReturnsPendingVerification() throws Exception {
        when(registrationService.register(any(RegisterRequest.class)))
            .thenReturn(new EmailRegistrationAccepted("person@example.test", "PENDING_EMAIL_VERIFICATION", 900));

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"person@example.test","password":"SecurePass123","name":"Example"}
                    """))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("PENDING_EMAIL_VERIFICATION"))
            .andExpect(jsonPath("$.expiresInSeconds").value(900));
    }

    @Test
    void invalidEmailIsRejectedBeforeRegistration() throws Exception {
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"not-an-email","password":"SecurePass123"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());

        verify(registrationService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void mobileOtpRequiresE164NumberAndSixDigitPass() throws Exception {
        mockMvc.perform(post("/auth/mobile/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"mobile":"5551234567","pass":"12"}
                    """))
            .andExpect(status().isBadRequest());

        verify(mobileOtpService, never()).verify(any(), any());
    }

    @Test
    void mobileOtpVerificationReturnsCompatibleAuthResponse() throws Exception {
        UserAccount user = new UserAccount("+15551234567", java.time.Instant.now());
        user.setId("507f1f77bcf86cd799439011");
        when(mobileOtpService.verify("+15551234567", "123456"))
            .thenReturn(new MobileOtpService.VerifiedMobile(user, true));
        when(tokenService.create(user)).thenReturn("node-compatible-token");

        mockMvc.perform(post("/auth/mobile/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"mobile":"+15551234567","pass":"123456"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.id").value("507f1f77bcf86cd799439011"))
            .andExpect(jsonPath("$.user.mobileVerified").value(true))
            .andExpect(jsonPath("$.token").value("node-compatible-token"));
    }
}
