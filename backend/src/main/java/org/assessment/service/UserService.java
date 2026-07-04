package org.assessment.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.assessment.persistence.User;
import org.assessment.util.BCryptHasher;
import com.resend.Resend;
import com.resend.services.emails.model.SendEmailRequest;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class UserService {

    private static final String RESEND_API_KEY = "re_Wdjc2LHw_813smXTcatWwXRXdoNSmcZjP";
    private static final Logger LOG = Logger.getLogger(UserService.class);

    @Transactional
    public User signup(Long id, String email, String password) {
        if (email == null || email.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Email and password are required");
        }

        if (User.findByEmail(email.trim()) != null) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        User user = new User();
        user.email = email.trim();
        user.passwordHash = BCryptHasher.hash(password);
        user.emailValidated = false;
        String token = UUID.randomUUID().toString();
        user.validationToken = token;
        
        user.persist();

        // Send email via Resend
        sendVerificationEmail(user.email, token);

        return user;
    }

    private void sendVerificationEmail(String recipientEmail, String token) {
        try {
            Resend resend = new Resend(RESEND_API_KEY);

            SendEmailRequest sendEmailRequest = SendEmailRequest.builder()
                    .from("onboarding@resend.dev")
                    .to(recipientEmail)
                    .subject("Verify your Email Address")
                    .html("<p>Welcome to the portal!</p>" +
                          "<p>Your email verification token is: <strong>" + token + "</strong></p>" +
                          "<p>Please enter this token in the verification screen to access your resume dashboard.</p>")
                    .build();

            resend.emails().send(sendEmailRequest);
        } catch (Exception e) {
            LOG.error("Failed to send verification email via Resend: " + e.getMessage(), e);
        }
    }

    @Transactional
    public boolean verifyEmail(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }

        User user = User.findByValidationToken(token.trim());
        if (user == null) {
            return false;
        }

        user.emailValidated = true;
        user.validationToken = null;
        user.persist();
        return true;
    }

    public User login(Long id, String email, String password) {
        if (password == null) {
            return null;
        }

        User user = null;
        if (id != null && email != null) {
            user = User.findByIdAndEmail(id, email);
        } else if (email != null) {
            user = User.findByEmail(email.trim());
        }

        if (user != null && BCryptHasher.check(password, user.passwordHash)) {
            return user;
        }

        return null;
    }

    public User findById(Long id) {
        return User.findById(id);
    }

    public User findByIdAndEmail(Long id, String email) {
        return User.findByIdAndEmail(id, email);
    }
}
