package com.nodeusers.registration.api;

import com.nodeusers.registration.domain.UserAccount;

public record AuthResponse(UserResponse user, String token) {
    public static AuthResponse from(UserAccount user, String token) {
        return new AuthResponse(UserResponse.from(user), token);
    }
}
