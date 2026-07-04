package org.assessment.persistence;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "portal_users")
public class User extends PanacheEntity {

    @Column(unique = true, nullable = false)
    public String email;

    @Column(name = "password_hash", nullable = false)
    public String passwordHash;

    @Column(name = "email_validated", nullable = false)
    public boolean emailValidated = false;

    @Column(name = "validation_token")
    public String validationToken;

    public static User findById(Long id) {
        if (id == null) return null;
        return find("id", id).firstResult();
    }

    public static User findByEmail(String email) {
        if (email == null) return null;
        return find("email", email.trim()).firstResult();
    }

    public static User findByValidationToken(String token) {
        if (token == null) return null;
        return find("validationToken", token.trim()).firstResult();
    }

    public static User findByIdAndEmail(Long id, String email) {
        if (id == null || email == null) return null;
        return find("id = ?1 and email = ?2", id, email.trim()).firstResult();
    }
}
