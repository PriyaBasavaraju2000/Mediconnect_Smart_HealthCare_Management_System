package com.mediconnect.notification;

import com.mediconnect.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private NotificationType type = NotificationType.GENERAL;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "reference_id")
    private Long referenceId; // e.g., appointment ID

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        APPOINTMENT_BOOKED,
        APPOINTMENT_CONFIRMED,
        APPOINTMENT_CANCELLED,
        APPOINTMENT_COMPLETED,      // ← add this
        APPOINTMENT_RESCHEDULED,    // ← add this
        APPOINTMENT_REMINDER,
        PRESCRIPTION_UPLOADED,
        SOS_ALERT,
        GENERAL
    }
}
