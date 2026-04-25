package com.mediconnect.auth;

import com.mediconnect.user.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDtos {

    // ─── Register Request ────────────────────────────────────────────────────────

    public static class RegisterRequest {

        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        private User.Role role;

        private String specialization;
        private String licenseNumber;
        private Integer experienceYears;

        // Explicit getters — no Lombok needed
        public String getName()            { return name; }
        public String getEmail()           { return email; }
        public String getPassword()        { return password; }
        public String getSpecialization()  { return specialization; }
        public String getLicenseNumber()   { return licenseNumber; }
        public Integer getExperienceYears(){ return experienceYears; }

        public User.Role getRole() {
            return role != null ? role : User.Role.PATIENT;
        }

        // Explicit setters (needed for Jackson deserialization)
        public void setName(String name)                       { this.name = name; }
        public void setEmail(String email)                     { this.email = email; }
        public void setPassword(String password)               { this.password = password; }
        public void setRole(User.Role role)                    { this.role = role; }
        public void setSpecialization(String specialization)   { this.specialization = specialization; }
        public void setLicenseNumber(String licenseNumber)     { this.licenseNumber = licenseNumber; }
        public void setExperienceYears(Integer experienceYears){ this.experienceYears = experienceYears; }
    }

    // ─── Login Request ───────────────────────────────────────────────────────────

    public static class LoginRequest {

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        public String getEmail()    { return email; }
        public String getPassword() { return password; }

        public void setEmail(String email)       { this.email = email; }
        public void setPassword(String password) { this.password = password; }
    }

    // ─── Refresh Token Request ───────────────────────────────────────────────────

    public static class RefreshTokenRequest {

        @NotBlank(message = "Refresh token is required")
        private String refreshToken;

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    // ─── Auth Response ───────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {

        private String accessToken;
        private String refreshToken;

        @Builder.Default
        private String tokenType = "Bearer";

        private Long expiresIn;
        private UserInfo user;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        @Builder
        public static class UserInfo {
            private Long id;
            private String name;
            private String email;
            private User.Role role;
            private String profileImage;
        }
    }
}