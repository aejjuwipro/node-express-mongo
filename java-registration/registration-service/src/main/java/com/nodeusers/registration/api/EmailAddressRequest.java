package com.nodeusers.registration.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailAddressRequest(
    @NotBlank @Email @Size(max = 254) String email
) {
}
