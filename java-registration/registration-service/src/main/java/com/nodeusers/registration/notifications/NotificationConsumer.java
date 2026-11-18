package com.nodeusers.registration.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Component
public class NotificationConsumer {
    private static final Logger logger = LoggerFactory.getLogger(NotificationConsumer.class);

    private final SmsGateway smsGateway;
    private final EmailGateway emailGateway;

    public NotificationConsumer(SmsGateway smsGateway, EmailGateway emailGateway) {
        this.smsGateway = smsGateway;
        this.emailGateway = emailGateway;
    }

    @RetryableTopic(
        attempts = "4",
        backoff = @Backoff(delay = 1000, multiplier = 2.0),
        dltTopicSuffix = ".dlt"
    )
    @KafkaListener(topics = "${app.kafka.notification-topic}")
    public void deliver(NotificationEvent event) {
        if ("sms".equals(event.channel())) {
            smsGateway.send(event.destination(), event.body());
        } else if ("email".equals(event.channel())) {
            emailGateway.send(event.destination(), event.subject(), event.body());
        } else {
            throw new IllegalArgumentException("Unsupported notification channel");
        }
        logger.info("Notification delivered eventId={} channel={}", event.eventId(), event.channel());
    }

    @DltHandler
    public void deadLetter(NotificationEvent event) {
        logger.error("Notification delivery exhausted retries eventId={} channel={}",
            event.eventId(), event.channel());
    }
}
