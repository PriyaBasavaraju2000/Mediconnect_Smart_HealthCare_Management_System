package com.mediconnect.user;

import com.mediconnect.util.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// ─── DTO ──────────────────────────────────────────────────────────────────────

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DoctorDto {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String specialization;
    private Integer experienceYears;
    private String bio;
    private Boolean available;
    private String profileImage;

    static DoctorDto from(Doctor d) {
        return DoctorDto.builder()
                .id(d.getId())
                .userId(d.getUser().getId())
                .name(d.getUser().getName())
                .email(d.getUser().getEmail())
                .specialization(d.getSpecialization())
                .experienceYears(d.getExperienceYears())
                .bio(d.getBio())
                .available(d.getAvailable())
                .profileImage(d.getUser().getProfileImage())
                .build();
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Service
@RequiredArgsConstructor
class DoctorService {

    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public List<DoctorDto> getAllAvailableDoctors() {
        return doctorRepository.findByAvailableTrue()
                .stream().map(DoctorDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorDto> getDoctorsBySpecialization(String specialization) {
        return doctorRepository.findBySpecializationIgnoreCase(specialization)
                .stream().map(DoctorDto::from).toList();
    }

    @Transactional(readOnly = true)
    public DoctorDto getDoctorById(Long doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new com.mediconnect.exception.ResourceNotFoundException("Doctor", "id", doctorId));
        return DoctorDto.from(doctor);
    }

    @Transactional
    public DoctorDto updateAvailability(Long userId, Boolean available) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new com.mediconnect.exception.ResourceNotFoundException("Doctor profile not found"));
        doctor.setAvailable(available);
        return DoctorDto.from(doctorRepository.save(doctor));
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
@Tag(name = "Doctors", description = "Browse and manage doctor profiles")
class DoctorController {

    private final DoctorService doctorService;

    @GetMapping
    @Operation(summary = "Get all available doctors (public)")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getAllDoctors() {
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved",
                doctorService.getAllAvailableDoctors()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a doctor's profile by ID (public)")
    public ResponseEntity<ApiResponse<DoctorDto>> getDoctorById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Doctor found",
                doctorService.getDoctorById(id)));
    }

    @GetMapping("/search")
    @Operation(summary = "Search doctors by specialization (public)")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> searchBySpecialization(
            @RequestParam String specialization) {
        return ResponseEntity.ok(ApiResponse.success("Doctors found",
                doctorService.getDoctorsBySpecialization(specialization)));
    }

    @PatchMapping("/availability")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Toggle doctor availability (Doctor only)")
    public ResponseEntity<ApiResponse<DoctorDto>> updateAvailability(
            @RequestParam Boolean available) {
        Long userId = com.mediconnect.util.SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Availability updated",
                doctorService.updateAvailability(userId, available)));
    }
}
