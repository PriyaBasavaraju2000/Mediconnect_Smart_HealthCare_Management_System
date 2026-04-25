package com.mediconnect.notification;

import com.mediconnect.user.User;
import com.mediconnect.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Central notification engine.
 *
 * Two delivery modes:
 *  1. WebSocket push  → real-time to connected clients via STOMP
 *  2. DB persistence  → stored for offline/unread retrieval
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ─── Send Notification ────────────────────────────────────────────────────

    /**
     * Send a notification to a specific user:
     * - Persists to DB (so it's available even if user is offline)
     * - Pushes via WebSocket to /user/{email}/queue/notifications (if connected)
     */
    @Async
    public void sendToUser(Long userId, String title, String message,
                           Notification.NotificationType type, Long referenceId) {

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot send notification: user {} not found", userId);
            return;
        }

        // 1. Persist in database
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build();
        notificationRepository.save(notification);

        // 2. Push via WebSocket (user-specific queue)
        NotificationPayload payload = NotificationPayload.builder()
                .title(title)
                .message(message)
                .type(type.name())
                .referenceId(referenceId)
                .timestamp(LocalDateTime.now())
                .build();

        messagingTemplate.convertAndSendToUser(
                user.getEmail(),            // principal name
                "/queue/notifications",     // destination
                payload
        );

        log.info("Notification sent to user {}: [{}] {}", userId, type, title);
    }

    /**
     * Broadcast to all subscribers of a topic (e.g., SOS alert to all doctors)
     */
    @Async
    public void broadcast(String topic, String title, String message,
                          Notification.NotificationType type) {

        NotificationPayload payload = NotificationPayload.builder()
                .title(title)
                .message(message)
                .type(type.name())
                .timestamp(LocalDateTime.now())
                .build();

        messagingTemplate.convertAndSend("/topic/" + topic, payload);
        log.info("Broadcast sent to topic '{}': {}", topic, title);
    }

    // ─── Pre-built Notification Templates ────────────────────────────────────

    public void notifyAppointmentBooked(Long patientUserId, Long doctorUserId,
                                        String doctorName, String appointmentTime, Long appointmentId) {
        // Notify patient
        sendToUser(patientUserId,
                "Appointment Booked",
                "Your appointment with Dr. " + doctorName + " is scheduled for " + appointmentTime,
                Notification.NotificationType.APPOINTMENT_BOOKED, appointmentId);

        // Notify doctor
        sendToUser(doctorUserId,
                "New Appointment",
                "A new appointment has been booked for " + appointmentTime,
                Notification.NotificationType.APPOINTMENT_BOOKED, appointmentId);
    }

    public void notifyAppointmentStatusChanged(Long patientUserId, String status,
                                               String doctorName, Long appointmentId) {
        Notification.NotificationType type;
        try {
            type = Notification.NotificationType.valueOf("APPOINTMENT_" + status.toUpperCase());
        } catch (IllegalArgumentException e) {
            type = Notification.NotificationType.GENERAL; // fallback for unknown statuses
        }

        sendToUser(patientUserId,
                "Appointment " + status,
                "Your appointment with Dr. " + doctorName + " has been " + status.toLowerCase(),
                type,
                appointmentId);
    }

    public void notifyPrescriptionUploaded(Long patientUserId, String doctorName, Long appointmentId) {
        sendToUser(patientUserId,
                "Prescription Ready",
                "Dr. " + doctorName + " has uploaded your prescription",
                Notification.NotificationType.PRESCRIPTION_UPLOADED, appointmentId);
    }

    public void notifySosAlert(Long patientUserId, String patientName) {
        // Persist for patient
        sendToUser(patientUserId,
                "SOS Alert Sent",
                "Your SOS alert has been broadcast to available doctors",
                Notification.NotificationType.SOS_ALERT, null);

        // Broadcast to all doctors
        broadcast("doctors.sos",
                "🚨 SOS Alert",
                "Patient " + patientName + " requires immediate assistance!",
                Notification.NotificationType.SOS_ALERT);
    }

    // ─── REST Query Methods ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<NotificationDto> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    // ─── Scheduled Cleanup ────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 2 * * *") // Every day at 2 AM
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        notificationRepository.deleteOlderThan(cutoff);
        log.info("Cleaned up notifications older than {}", cutoff);
    }
}
