package com.mediconnect.prescription;

import com.mediconnect.appointment.Appointment;
import com.mediconnect.exception.BadRequestException;
import com.mediconnect.exception.ResourceNotFoundException;
import com.mediconnect.notification.NotificationService;
import com.mediconnect.user.Doctor;
import com.mediconnect.user.DoctorRepository;
import com.mediconnect.user.Patient;
import com.mediconnect.user.PatientRepository;
import com.mediconnect.util.ApiResponse;
import com.mediconnect.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity
@Table(name = "prescriptions")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String medications;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

// ─── Repository ───────────────────────────────────────────────────────────────

@Repository
interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    // Query by patient.id (from patients table)
    Page<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId, Pageable pageable);
    // Query by doctor.id (from doctors table)
    Page<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId, Pageable pageable);
    void deleteByDoctorId(Long doctorId);
    void deleteByPatientId(Long patientId);
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
class CreatePrescriptionRequest {
    private Long appointmentId;
    private String fileUrl;
    private String diagnosis;
    private String medications;
    private String instructions;
    private LocalDate validUntil;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PrescriptionDto {
    private Long id;
    private Long appointmentId;
    private String doctorName;
    private String patientName;
    private String fileUrl;
    private String diagnosis;
    private String medications;
    private String instructions;
    private LocalDate validUntil;
    private LocalDateTime createdAt;

    static PrescriptionDto from(Prescription p) {
        return PrescriptionDto.builder()
                .id(p.getId())
                .appointmentId(p.getAppointment().getId())
                .doctorName(p.getDoctor().getUser().getName())
                .patientName(p.getPatient().getUser().getName())
                .fileUrl(p.getFileUrl())
                .diagnosis(p.getDiagnosis())
                .medications(p.getMedications())
                .instructions(p.getInstructions())
                .validUntil(p.getValidUntil())
                .createdAt(p.getCreatedAt())
                .build();
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Service
@RequiredArgsConstructor
class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;
    private final com.mediconnect.appointment.AppointmentRepository appointmentRepository;

    @Transactional
    public PrescriptionDto createPrescription(Long doctorUserId, CreatePrescriptionRequest request) {
        // userId → doctor profile
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile not found for userId: " + doctorUserId));

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", request.getAppointmentId()));

        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BadRequestException("You can only create prescriptions for your own appointments");
        }

        Prescription prescription = Prescription.builder()
                .appointment(appointment)
                .doctor(doctor)
                .patient(appointment.getPatient())
                .fileUrl(request.getFileUrl())
                .diagnosis(request.getDiagnosis())
                .medications(request.getMedications())
                .instructions(request.getInstructions())
                .validUntil(request.getValidUntil())
                .build();

        prescription = prescriptionRepository.save(prescription);

        notificationService.notifyPrescriptionUploaded(
                appointment.getPatient().getUser().getId(),
                doctor.getUser().getName(),
                appointment.getId()
        );

        return PrescriptionDto.from(prescription);
    }

    // ✅ FIXED: patientUserId → look up patient profile → use patient.id
    @Transactional(readOnly = true)
    public Page<PrescriptionDto> getPatientPrescriptions(Long patientUserId, Pageable pageable) {
        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient profile not found for userId: " + patientUserId));
        return prescriptionRepository
                .findByPatientIdOrderByCreatedAtDesc(patient.getId(), pageable)
                .map(PrescriptionDto::from);
    }

    // ✅ FIXED: doctorUserId → look up doctor profile → use doctor.id
    @Transactional(readOnly = true)
    public Page<PrescriptionDto> getDoctorPrescriptions(Long doctorUserId, Pageable pageable) {
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile not found for userId: " + doctorUserId));
        return prescriptionRepository
                .findByDoctorIdOrderByCreatedAtDesc(doctor.getId(), pageable)
                .map(PrescriptionDto::from);
    }

    @Transactional(readOnly = true)
    public PrescriptionDto getPrescription(Long id) {
        return prescriptionRepository.findById(id)
                .map(PrescriptionDto::from)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription", "id", id));
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/v1/prescriptions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Prescriptions", description = "Create and retrieve prescriptions")
class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Create a prescription (Doctor only)")
    public ResponseEntity<ApiResponse<PrescriptionDto>> create(
            @RequestBody CreatePrescriptionRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        PrescriptionDto dto = prescriptionService.createPrescription(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Prescription created", dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a specific prescription")
    public ResponseEntity<ApiResponse<PrescriptionDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Prescription found",
                prescriptionService.getPrescription(id)));
    }

    // ✅ Patient endpoint — uses patient profile lookup
    @GetMapping("/my")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get all prescriptions for logged-in patient")
    public ResponseEntity<ApiResponse<Page<PrescriptionDto>>> getMyPrescriptions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved",
                prescriptionService.getPatientPrescriptions(
                        userId, PageRequest.of(page, size))));
    }

    // ✅ Doctor endpoint — uses doctor profile lookup
    @GetMapping("/doctor/my")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get all prescriptions issued by logged-in doctor")
    public ResponseEntity<ApiResponse<Page<PrescriptionDto>>> getDoctorPrescriptions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved",
                prescriptionService.getDoctorPrescriptions(
                        userId, PageRequest.of(page, size))));
    }
}