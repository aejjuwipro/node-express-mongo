package com.nodeusers.registration.api;

import com.nodeusers.registration.domain.UserAccount;

public record UserResponse(
    String id,
    String name,
    String email,
    boolean emailVerified,
    String mobile,
    boolean mobileVerified
) {
    public static UserResponse from(UserAccount user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getEmailVerifiedAt() != null,
            user.getMobile(),
            user.getMobileVerifiedAt() != null
        );
    }
}
