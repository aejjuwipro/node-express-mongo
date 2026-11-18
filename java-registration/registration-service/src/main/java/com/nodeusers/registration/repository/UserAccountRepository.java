package com.nodeusers.registration.repository;

import java.util.Optional;
import com.nodeusers.registration.domain.UserAccount;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserAccountRepository extends MongoRepository<UserAccount, String> {
    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByMobile(String mobile);
}
