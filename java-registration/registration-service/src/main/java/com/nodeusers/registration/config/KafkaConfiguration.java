package com.nodeusers.registration.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfiguration {
    @Bean
    NewTopic notificationTopic(RegistrationSettings settings) {
        return TopicBuilder.name(settings.getKafka().getNotificationTopic())
            .partitions(1)
            .replicas(1)
            .build();
    }
}
