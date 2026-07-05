package org.assessment.persistence;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "portal_resumes")
public class Resume extends PanacheEntity {

    @Column(name = "user_id", unique = true, nullable = false)
    public Long userId;

    @Column(name = "full_name", nullable = false)
    public String fullName;

    public String title;
    public String phone;

    @Column(length = 2000)
    public String summary;

    @Column(length = 4000)
    public String experience;

    @Column(length = 4000)
    public String education;

    @Column(length = 2000)
    public String skills;

    public static Resume findByUserId(Long userId) {
        if (userId == null) return null;
        return find("userId", userId).firstResult();
    }
}
