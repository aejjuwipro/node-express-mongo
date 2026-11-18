package com.nodeusers.registration.notifications;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.nodeusers.registration.config.RegistrationSettings;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class AirtelSmsGatewayTest {
    @Test
    void postsConfiguredSmsPayloadWithAuthenticationHeader() {
        RegistrationSettings settings = new RegistrationSettings();
        RegistrationSettings.Sms sms = settings.getSms();
        sms.setAirtelApiUrl("https://sms.example.test/api/v1/send-sms");
        sms.setAirtelAuthHeader("Authorization");
        sms.setAirtelAuthScheme("Bearer");
        sms.setAirtelAuthValue("unit-test-token");
        sms.setAirtelCustomerId("customer-test");
        sms.setAirtelSenderId("NODEUSR");
        sms.setAirtelTemplateId("template-test");

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://sms.example.test/api/v1/send-sms"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer unit-test-token"))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(content().json("""
                {
                  "customerId":"customer-test",
                  "destinationAddress":"919876543210",
                  "message":"Your verification code is 123456",
                  "sourceAddress":"NODEUSR",
                  "messageType":"SMS",
                  "dltTemplateId":"template-test"
                }
                """))
            .andRespond(withSuccess());

        new AirtelSmsGateway(builder.build(), settings).send("+919876543210", "Your verification code is 123456");

        server.verify();
    }
}
