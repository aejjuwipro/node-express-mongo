package com.nodeusers.registration.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MobileOtpVerifyRequest(
    @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$") String mobile,
    @NotBlank @Pattern(regexp = "^\\d{6}$") String pass
) {
}
