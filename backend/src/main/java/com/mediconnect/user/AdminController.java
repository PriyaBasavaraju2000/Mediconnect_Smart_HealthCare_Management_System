package com.mediconnect.user;

import com.mediconnect.exception.BadRequestException;
import com.mediconnect.exception.ResourceNotFoundException;
import com.mediconnect.util.ApiResponse;
import com.mediconnect.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
class AdminUserDto {
    private Long id;
    private String name;
    private String email;
    private User.Role role;
    private Boolean enabled;
    private String provider;
    private LocalDateTime createdAt;

    // Doctor-specific
    private String specialization;
    private String licenseNumber;
    private Integer experienceYears;
    private Boolean available;

    // Patient-specific
    private String bloodGroup;
    private String phone;
    private String gender;

    static AdminUserDto fromUser(User u, Doctor d, Patient p) {
        AdminUserDto dto = new AdminUserDto();
        dto.setId(u.getId());
        dto.setName(u.getName());
        dto.setEmail(u.getEmail());
        dto.setRole(u.getRole());
        dto.setEnabled(u.getEnabled());
        dto.setProvider(u.getProvider().name());
        dto.setCreatedAt(u.getCreatedAt());
        if (d != null) {
            dto.setSpecialization(d.getSpecialization());
            dto.setLicenseNumber(d.getLicenseNumber());
            dto.setExperienceYears(d.getExperienceYears());
            dto.setAvailable(d.getAvailable());
        }
        if (p != null) {
            dto.setBloodGroup(p.getBloodGroup());
            dto.setPhone(p.getPhone());
            dto.setGender(p.getGender());
        }
        return dto;
    }
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class CreateUserRequest {
    private String name;
    private String email;
    private String password;
    private User.Role role;
    private String specialization;
    private String licenseNumber;
    private Integer experienceYears;
    private String phone;
    private String bloodGroup;
    private String gender;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class UpdateUserRequest {
    private String name;
    private String email;
    private Boolean enabled;
    private String specialization;
    private Integer experienceYears;
    private Boolean available;
    private String phone;
    private String bloodGroup;
    private String gender;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Service
@RequiredArgsConstructor
class AdminService {

    private final UserRepository     userRepository;
    private final PatientRepository  patientRepository;
    private final DoctorRepository   doctorRepository;
    private final PasswordEncoder    passwordEncoder;

    // ── Stats ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        long totalUsers   = userRepository.count();
        long totalDoctors = doctorRepository.count();
        long totalPatients= patientRepository.count();
        long activeUsers  = userRepository.findAll().stream().filter(u -> u.getEnabled()).count();
        return Map.of(
                "totalUsers",    totalUsers,
                "totalDoctors",  totalDoctors,
                "totalPatients", totalPatients,
                "activeUsers",   activeUsers
        );
    }

    // ── Get all users ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminUserDto> getAllUsers(int page, int size, String role) {
        List<User> users;
        if (role != null && !role.equals("ALL")) {
            User.Role r = User.Role.valueOf(role.toUpperCase());
            users = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == r)
                    .toList();
        } else {
            users = userRepository.findAll();
        }

        List<AdminUserDto> dtos = users.stream().map(u -> {
            Doctor  d = doctorRepository.findByUserId(u.getId()).orElse(null);
            Patient p = patientRepository.findByUserId(u.getId()).orElse(null);
            return AdminUserDto.fromUser(u, d, p);
        }).toList();

        int start = Math.min(page * size, dtos.size());
        int end   = Math.min(start + size, dtos.size());
        return new PageImpl<>(dtos.subList(start, end), PageRequest.of(page, size), dtos.size());
    }

    // ── Get single user ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminUserDto getUser(Long userId) {
        User    u = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Doctor  d = doctorRepository.findByUserId(userId).orElse(null);
        Patient p = patientRepository.findByUserId(userId).orElse(null);
        return AdminUserDto.fromUser(u, d, p);
    }

    // ── Create user ────────────────────────────────────────────────────────────

    @Transactional
    public AdminUserDto createUser(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email already registered: " + req.getEmail());
        }

        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole() != null ? req.getRole() : User.Role.PATIENT);
        user.setProvider(User.AuthProvider.LOCAL);
        user.setEnabled(true);
        user = userRepository.save(user);

        Doctor  savedDoctor  = null;
        Patient savedPatient = null;

        if (user.getRole() == User.Role.DOCTOR) {
            if (req.getLicenseNumber() == null || req.getSpecialization() == null) {
                throw new BadRequestException("Doctor requires specialization and licenseNumber");
            }
            Doctor doctor = new Doctor();
            doctor.setUser(user);
            doctor.setSpecialization(req.getSpecialization());
            doctor.setLicenseNumber(req.getLicenseNumber());
            doctor.setExperienceYears(req.getExperienceYears() != null ? req.getExperienceYears() : 0);
            doctor.setAvailable(true);
            savedDoctor = doctorRepository.save(doctor);

        } else if (user.getRole() == User.Role.PATIENT) {
            Patient patient = new Patient();
            patient.setUser(user);
            patient.setPhone(req.getPhone());
            patient.setBloodGroup(req.getBloodGroup());
            patient.setGender(req.getGender());
            savedPatient = patientRepository.save(patient);
        }

        return AdminUserDto.fromUser(user, savedDoctor, savedPatient);
    }

    // ── Update user ────────────────────────────────────────────────────────────

    @Transactional
    public AdminUserDto updateUser(Long userId, UpdateUserRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (req.getName()    != null) user.setName(req.getName());
        if (req.getEmail()   != null) user.setEmail(req.getEmail());
        if (req.getEnabled() != null) user.setEnabled(req.getEnabled());
        user = userRepository.save(user);

        Doctor doctor = doctorRepository.findByUserId(userId).orElse(null);
        if (doctor != null) {
            if (req.getSpecialization()  != null) doctor.setSpecialization(req.getSpecialization());
            if (req.getExperienceYears() != null) doctor.setExperienceYears(req.getExperienceYears());
            if (req.getAvailable()       != null) doctor.setAvailable(req.getAvailable());
            doctorRepository.save(doctor);
        }

        Patient patient = patientRepository.findByUserId(userId).orElse(null);
        if (patient != null) {
            if (req.getPhone()      != null) patient.setPhone(req.getPhone());
            if (req.getBloodGroup() != null) patient.setBloodGroup(req.getBloodGroup());
            if (req.getGender()     != null) patient.setGender(req.getGender());
            patientRepository.save(patient);
        }

        return AdminUserDto.fromUser(user, doctor, patient);
    }

    // ── Toggle enable/disable ──────────────────────────────────────────────────

    @Transactional
    public AdminUserDto toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setEnabled(!user.getEnabled());
        userRepository.save(user);
        Doctor  d = doctorRepository.findByUserId(userId).orElse(null);
        Patient p = patientRepository.findByUserId(userId).orElse(null);
        return AdminUserDto.fromUser(user, d, p);
    }

    // ── Delete user ────────────────────────────────────────────────────────────

    @Transactional
    public void deleteUser(Long userId, Long adminId) {
        if (userId.equals(adminId)) {
            throw new BadRequestException("Admin cannot delete their own account");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Cascade deletes doctor/patient via FK ON DELETE CASCADE
        userRepository.delete(user);
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin", description = "Admin panel — manage users, doctors and patients")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard statistics")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success("Stats retrieved", adminService.getStats()));
    }

    @GetMapping("/users")
    @Operation(summary = "Get all users with optional role filter")
    public ResponseEntity<ApiResponse<Page<AdminUserDto>>> getAllUsers(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "10")  int size,
            @RequestParam(defaultValue = "ALL") String role) {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved",
                adminService.getAllUsers(page, size, role)));
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get a specific user by ID")
    public ResponseEntity<ApiResponse<AdminUserDto>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User found", adminService.getUser(id)));
    }

    @PostMapping("/users")
    @Operation(summary = "Create a new user (patient or doctor)")
    public ResponseEntity<ApiResponse<AdminUserDto>> createUser(
            @RequestBody CreateUserRequest request) {
        AdminUserDto user = adminService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", user));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update user details")
    public ResponseEntity<ApiResponse<AdminUserDto>> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success("User updated",
                adminService.updateUser(id, request)));
    }

    @PatchMapping("/users/{id}/toggle-status")
    @Operation(summary = "Enable or disable a user account")
    public ResponseEntity<ApiResponse<AdminUserDto>> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Status toggled",
                adminService.toggleUserStatus(id)));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Permanently delete a user")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        Long adminId = SecurityUtils.getCurrentUserId();
        adminService.deleteUser(id, adminId);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }
}