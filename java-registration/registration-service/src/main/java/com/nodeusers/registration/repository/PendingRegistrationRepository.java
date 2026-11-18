package com.nodeusers.registration.repository;

import java.util.Optional;
import com.nodeusers.registration.domain.PendingRegistration;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PendingRegistrationRepository extends MongoRepository<PendingRegistration, String> {
    Optional<PendingRegistration> findByEmail(String email);

    boolean existsByEmail(String email);

    void deleteByEmail(String email);
}
