package com.mediconnect.appointment;

import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Page<Appointment> findByPatientIdOrderByAppointmentTimeDesc(Long patientId, Pageable pageable);

    Page<Appointment> findByDoctorIdOrderByAppointmentTimeDesc(Long doctorId, Pageable pageable);
    void deleteByDoctorId(Long doctorId);
    void deleteByPatientId(Long patientId);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.doctor.id = :doctorId
        AND a.status NOT IN ('CANCELLED')
        AND a.appointmentTime < :endTime
        AND a.appointmentTime > :startTime
        """)
    List<Appointment> findConflictingAppointments(
            @Param("doctorId") Long doctorId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("""
            SELECT a FROM Appointment a
            WHERE a.status = 'CONFIRMED'
            AND a.appointmentTime BETWEEN :from AND :to
            """)
    List<Appointment> findUpcomingAppointments(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
class BookAppointmentRequest {
    @jakarta.validation.constraints.NotNull
    private Long doctorId;

    @jakarta.validation.constraints.NotNull
    private LocalDateTime appointmentTime;

    private Integer durationMinutes = 30;
    private String reason;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class UpdateAppointmentRequest {
    private Appointment.AppointmentStatus status;
    private String notes;
    private String meetingLink;
    private LocalDateTime newAppointmentTime;
}

// ─── Response DTO ─────────────────────────────────────────────────────────────

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AppointmentDto {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private LocalDateTime appointmentTime;
    private Integer durationMinutes;
    private Appointment.AppointmentStatus status;
    private String reason;
    private String notes;
    private String meetingLink;
    private LocalDateTime createdAt;

    static AppointmentDto from(Appointment a) {
        return AppointmentDto.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getUser().getName())
                .doctorId(a.getDoctor().getId())
                .doctorName(a.getDoctor().getUser().getName())
                .doctorSpecialization(a.getDoctor().getSpecialization())
                .appointmentTime(a.getAppointmentTime())
                .durationMinutes(a.getDurationMinutes())
                .status(a.getStatus())
                .reason(a.getReason())
                .notes(a.getNotes())
                .meetingLink(a.getMeetingLink())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
