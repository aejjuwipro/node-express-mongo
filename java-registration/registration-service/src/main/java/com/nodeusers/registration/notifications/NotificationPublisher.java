package com.nodeusers.registration.notifications;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import com.nodeusers.registration.config.RegistrationSettings;
import com.nodeusers.registration.security.SecretHasher;
import com.nodeusers.registration.service.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationPublisher {
    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;
    private final RegistrationSettings settings;

    public NotificationPublisher(
        KafkaTemplate<String, NotificationEvent> kafkaTemplate,
        RegistrationSettings settings
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.settings = settings;
    }

    public void publish(NotificationEvent event) {
        String key = SecretHasher.identifier(event.destination());
        try {
            kafkaTemplate.send(settings.getKafka().getNotificationTopic(), key, event)
                .get(5, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Notification queue is temporarily unavailable");
        } catch (ExecutionException | TimeoutException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Notification queue is temporarily unavailable");
        }
    }
}
