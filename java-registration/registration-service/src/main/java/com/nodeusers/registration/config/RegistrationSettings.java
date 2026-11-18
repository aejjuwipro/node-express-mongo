package com.nodeusers.registration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class RegistrationSettings {
    private String publicBaseUrl;
    private Jwt jwt = new Jwt();
    private Otp otp = new Otp();
    private Sms sms = new Sms();
    private Email email = new Email();
    private Kafka kafka = new Kafka();

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Otp getOtp() {
        return otp;
    }

    public void setOtp(Otp otp) {
        this.otp = otp;
    }

    public Sms getSms() {
        return sms;
    }

    public void setSms(Sms sms) {
        this.sms = sms;
    }

    public Email getEmail() {
        return email;
    }

    public void setEmail(Email email) {
        this.email = email;
    }

    public Kafka getKafka() {
        return kafka;
    }

    public void setKafka(Kafka kafka) {
        this.kafka = kafka;
    }

    public static class Jwt {
        private String secret;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }
    }

    public static class Otp {
        private String hmacSecret;
        private java.time.Duration ttl;
        private java.time.Duration emailTtl;
        private java.time.Duration resendCooldown;
        private int maxAttempts = 5;
        private boolean exposeCode;

        public String getHmacSecret() {
            return hmacSecret;
        }

        public void setHmacSecret(String hmacSecret) {
            this.hmacSecret = hmacSecret;
        }

        public java.time.Duration getTtl() {
            return ttl;
        }

        public void setTtl(java.time.Duration ttl) {
            this.ttl = ttl;
        }

        public java.time.Duration getEmailTtl() {
            return emailTtl;
        }

        public void setEmailTtl(java.time.Duration emailTtl) {
            this.emailTtl = emailTtl;
        }

        public java.time.Duration getResendCooldown() {
            return resendCooldown;
        }

        public void setResendCooldown(java.time.Duration resendCooldown) {
            this.resendCooldown = resendCooldown;
        }

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public boolean isExposeCode() {
            return exposeCode;
        }

        public void setExposeCode(boolean exposeCode) {
            this.exposeCode = exposeCode;
        }
    }

    public static class Sms {
        private String provider;
        private String airtelApiUrl;
        private String airtelAuthHeader;
        private String airtelAuthScheme;
        private String airtelAuthValue;
        private String airtelCustomerId;
        private String airtelSenderId;
        private String airtelTemplateId;

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getAirtelApiUrl() {
            return airtelApiUrl;
        }

        public void setAirtelApiUrl(String airtelApiUrl) {
            this.airtelApiUrl = airtelApiUrl;
        }

        public String getAirtelAuthHeader() {
            return airtelAuthHeader;
        }

        public void setAirtelAuthHeader(String airtelAuthHeader) {
            this.airtelAuthHeader = airtelAuthHeader;
        }

        public String getAirtelAuthScheme() {
            return airtelAuthScheme;
        }

        public void setAirtelAuthScheme(String airtelAuthScheme) {
            this.airtelAuthScheme = airtelAuthScheme;
        }

        public String getAirtelAuthValue() {
            return airtelAuthValue;
        }

        public void setAirtelAuthValue(String airtelAuthValue) {
            this.airtelAuthValue = airtelAuthValue;
        }

        public String getAirtelCustomerId() {
            return airtelCustomerId;
        }

        public void setAirtelCustomerId(String airtelCustomerId) {
            this.airtelCustomerId = airtelCustomerId;
        }

        public String getAirtelSenderId() {
            return airtelSenderId;
        }

        public void setAirtelSenderId(String airtelSenderId) {
            this.airtelSenderId = airtelSenderId;
        }

        public String getAirtelTemplateId() {
            return airtelTemplateId;
        }

        public void setAirtelTemplateId(String airtelTemplateId) {
            this.airtelTemplateId = airtelTemplateId;
        }
    }

    public static class Email {
        private String from;

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }

    public static class Kafka {
        private String notificationTopic;

        public String getNotificationTopic() {
            return notificationTopic;
        }

        public void setNotificationTopic(String notificationTopic) {
            this.notificationTopic = notificationTopic;
        }
    }
}
