package com.nodeusers.registration.notifications;

import com.nodeusers.registration.config.RegistrationSettings;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailGateway implements EmailGateway {
    private final JavaMailSender mailSender;
    private final RegistrationSettings settings;

    public SmtpEmailGateway(JavaMailSender mailSender, RegistrationSettings settings) {
        this.mailSender = mailSender;
        this.settings = settings;
    }

    @Override
    public void send(String email, String subject, String message) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(settings.getEmail().getFrom());
        mail.setTo(email);
        mail.setSubject(subject);
        mail.setText(message);
        mailSender.send(mail);
    }
}
