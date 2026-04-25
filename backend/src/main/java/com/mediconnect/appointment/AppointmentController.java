package com.mediconnect.appointment;

import com.mediconnect.util.ApiResponse;
import com.mediconnect.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Appointments", description = "Book, manage, and track appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Book a new appointment")
    public ResponseEntity<ApiResponse<AppointmentDto>> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        AppointmentDto appointment = appointmentService.bookAppointment(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Appointment booked successfully", appointment));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get appointment by ID")
    public ResponseEntity<ApiResponse<AppointmentDto>> getAppointment(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Appointment found",
                appointmentService.getAppointment(id)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Update appointment status, notes or meeting link")
    public ResponseEntity<ApiResponse<AppointmentDto>> updateAppointment(
            @PathVariable Long id,
            @RequestBody UpdateAppointmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        AppointmentDto updated = appointmentService.updateAppointment(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success("Appointment updated", updated));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Get all appointments for logged-in patient")
    public ResponseEntity<ApiResponse<Page<AppointmentDto>>> getMyAppointments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Page<AppointmentDto> appointments = appointmentService.getPatientAppointments(
                userId,
                PageRequest.of(page, size, Sort.by("appointmentTime").descending()));
        return ResponseEntity.ok(ApiResponse.success("Appointments retrieved", appointments));
    }

    @GetMapping("/doctor/my")
    @PreAuthorize("hasRole('DOCTOR')")
    @Operation(summary = "Get all appointments for logged-in doctor")
    public ResponseEntity<ApiResponse<Page<AppointmentDto>>> getDoctorAppointments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Page<AppointmentDto> appointments = appointmentService.getDoctorAppointments(
                userId,
                PageRequest.of(page, size, Sort.by("appointmentTime").descending()));
        return ResponseEntity.ok(ApiResponse.success("Appointments retrieved", appointments));
    }
}