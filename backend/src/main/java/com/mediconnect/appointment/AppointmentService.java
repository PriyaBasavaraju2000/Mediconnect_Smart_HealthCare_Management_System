package com.mediconnect.appointment;

import com.mediconnect.exception.BadRequestException;
import com.mediconnect.exception.ResourceNotFoundException;
import com.mediconnect.notification.NotificationService;
import com.mediconnect.user.Doctor;
import com.mediconnect.user.DoctorRepository;
import com.mediconnect.user.Patient;
import com.mediconnect.user.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter DISPLAY_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy 'at' hh:mm a");

    // ─── Book Appointment ─────────────────────────────────────────────────────

    @Transactional
    public AppointmentDto bookAppointment(Long patientUserId, BookAppointmentRequest request) {
        if (request.getAppointmentTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Appointment time must be in the future");
        }

        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", request.getDoctorId()));

        if (!doctor.getAvailable()) {
            throw new BadRequestException("Doctor is currently unavailable for appointments");
        }

        LocalDateTime endTime = request.getAppointmentTime()
                .plusMinutes(request.getDurationMinutes());

        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                doctor.getId(), request.getAppointmentTime(), endTime);

        if (!conflicts.isEmpty()) {
            throw new BadRequestException(
                    "Doctor is not available at the requested time. Please choose another slot.");
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(request.getAppointmentTime())
                .durationMinutes(request.getDurationMinutes())
                .reason(request.getReason())
                .status(Appointment.AppointmentStatus.PENDING)
                .build();

        appointment = appointmentRepository.save(appointment);

        String formattedTime = request.getAppointmentTime().format(DISPLAY_FORMAT);
        notificationService.notifyAppointmentBooked(
                patientUserId,
                doctor.getUser().getId(),
                doctor.getUser().getName(),
                formattedTime,
                appointment.getId()
        );

        log.info("Appointment booked: patient={}, doctor={}, time={}",
                patient.getId(), doctor.getId(), request.getAppointmentTime());

        return AppointmentDto.from(appointment);
    }

    // ─── Update Appointment Status ────────────────────────────────────────────

    @Transactional
    public AppointmentDto updateAppointment(Long appointmentId, Long actorUserId,
                                            UpdateAppointmentRequest request) {
        Appointment appointment = getAppointmentById(appointmentId);

        if (request.getStatus() != null) {
            validateStatusTransition(appointment.getStatus(), request.getStatus());
            appointment.setStatus(request.getStatus());

            notificationService.notifyAppointmentStatusChanged(
                    appointment.getPatient().getUser().getId(),
                    request.getStatus().name(),
                    appointment.getDoctor().getUser().getName(),
                    appointmentId
            );
        }

        if (request.getNotes() != null) appointment.setNotes(request.getNotes());
        if (request.getMeetingLink() != null) appointment.setMeetingLink(request.getMeetingLink());

        if (request.getNewAppointmentTime() != null) {
            if (request.getNewAppointmentTime().isBefore(LocalDateTime.now())) {
                throw new BadRequestException("New appointment time must be in the future");
            }
            appointment.setAppointmentTime(request.getNewAppointmentTime());
            appointment.setStatus(Appointment.AppointmentStatus.RESCHEDULED);
        }

        return AppointmentDto.from(appointmentRepository.save(appointment));
    }

    // ─── Query Methods ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AppointmentDto> getPatientAppointments(Long patientUserId, Pageable pageable) {
        // FIXED: look up patient profile by userId first, then query by profile id
        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient profile not found for userId: " + patientUserId));

        return appointmentRepository
                .findByPatientIdOrderByAppointmentTimeDesc(patient.getId(), pageable)
                .map(AppointmentDto::from);
    }

    @Transactional(readOnly = true)
    public Page<AppointmentDto> getDoctorAppointments(Long doctorUserId, Pageable pageable) {
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile not found for userId: " + doctorUserId));

        return appointmentRepository
                .findByDoctorIdOrderByAppointmentTimeDesc(doctor.getId(), pageable)
                .map(AppointmentDto::from);
    }

    @Transactional(readOnly = true)
    public AppointmentDto getAppointment(Long appointmentId) {
        return AppointmentDto.from(getAppointmentById(appointmentId));
    }

    // ─── Scheduled: 15-min Reminder ───────────────────────────────────────────

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendAppointmentReminders() {
        LocalDateTime from = LocalDateTime.now().plusMinutes(14);
        LocalDateTime to   = LocalDateTime.now().plusMinutes(16);

        List<Appointment> upcoming = appointmentRepository.findUpcomingAppointments(from, to);
        for (Appointment apt : upcoming) {
            notificationService.sendToUser(
                    apt.getPatient().getUser().getId(),
                    "⏰ Appointment Reminder",
                    "Your appointment with Dr. " + apt.getDoctor().getUser().getName()
                            + " starts in 15 minutes",
                    com.mediconnect.notification.Notification.NotificationType.APPOINTMENT_REMINDER,
                    apt.getId()
            );
            log.debug("Reminder sent for appointment {}", apt.getId());
        }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private Appointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", id));
    }

    private void validateStatusTransition(Appointment.AppointmentStatus current,
                                          Appointment.AppointmentStatus next) {
        if (current == Appointment.AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot modify a cancelled appointment");
        }
        if (current == Appointment.AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot modify a completed appointment");
        }
    }
}