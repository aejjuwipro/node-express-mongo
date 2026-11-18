package com.nodeusers.registration.notifications;

import java.util.Map;
import com.nodeusers.registration.config.RegistrationSettings;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "airtel")
public class AirtelSmsGateway implements SmsGateway {
    private final RestClient restClient;
    private final RegistrationSettings settings;

    public AirtelSmsGateway(
        @Qualifier("airtelRestClient") RestClient restClient,
        RegistrationSettings settings
    ) {
        this.restClient = restClient;
        this.settings = settings;
    }

    @Override
    public void send(String mobile, String message) {
        RegistrationSettings.Sms airtel = settings.getSms();
        Map<String, String> payload = Map.of(
            "customerId", airtel.getAirtelCustomerId(),
            "destinationAddress", mobile.replaceFirst("^\\+", ""),
            "message", message,
            "sourceAddress", airtel.getAirtelSenderId(),
            "messageType", "SMS",
            "dltTemplateId", airtel.getAirtelTemplateId());
        String authorization = airtel.getAirtelAuthScheme().isBlank()
            ? airtel.getAirtelAuthValue()
            : airtel.getAirtelAuthScheme() + " " + airtel.getAirtelAuthValue();

        restClient.post()
            .uri(airtel.getAirtelApiUrl())
            .header(airtel.getAirtelAuthHeader(), authorization)
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .body(payload)
            .retrieve()
            .toBodilessEntity();
    }

    @Override
    public String providerName() {
        return "airtel";
    }
}
