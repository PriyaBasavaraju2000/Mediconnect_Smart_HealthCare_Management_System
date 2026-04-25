package com.mediconnect.auth;

import com.mediconnect.auth.AuthDtos.*;
import com.mediconnect.exception.BadRequestException;
import com.mediconnect.exception.ResourceNotFoundException;
import com.mediconnect.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;

    // ─── Register ────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : User.Role.PATIENT)
                .provider(User.AuthProvider.LOCAL)
                .build();

        user = userRepository.save(user);

        // Create role-specific profile
        if (user.getRole() == User.Role.PATIENT) {
            Patient patient = Patient.builder().user(user).build();
            patientRepository.save(patient);
        } else if (user.getRole() == User.Role.DOCTOR) {
            if (request.getLicenseNumber() == null || request.getSpecialization() == null) {
                throw new BadRequestException("Doctor registration requires licenseNumber and specialization");
            }
            if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
                throw new BadRequestException("License number already registered");
            }
            Doctor doctor = Doctor.builder()
                    .user(user)
                    .specialization(request.getSpecialization())
                    .licenseNumber(request.getLicenseNumber())
                    .experienceYears(request.getExperienceYears() != null ? request.getExperienceYears() : 0)
                    .build();
            doctorRepository.save(doctor);
        }

        log.info("New user registered: {} with role {}", user.getEmail(), user.getRole());
        return generateTokenPair(user);
    }

    // ─── Login ───────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        log.info("User logged in: {}", user.getEmail());
        return generateTokenPair(user);
    }

    // ─── Refresh Token ───────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(token)) {
            throw new BadRequestException("Invalid refresh token");
        }

        RefreshToken storedToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Refresh token not found"));

        if (!storedToken.isValid()) {
            throw new BadRequestException("Refresh token has expired or been revoked");
        }

        // Rotate: revoke old, issue new
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = storedToken.getUser();
        return generateTokenPair(user);
    }

    // ─── Logout ──────────────────────────────────────────────────────────────────

    @Transactional
    public void logout(String accessToken, Long userId) {
        // Blacklist the access token in Redis
        tokenBlacklistService.blacklist(accessToken);

        // Revoke all refresh tokens for this user
        refreshTokenRepository.revokeAllUserTokens(userId);

        log.info("User {} logged out", userId);
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────────

    private AuthResponse generateTokenPair(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail());
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(user.getEmail());

        // Persist refresh token
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiry / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(refreshTokenExpiry / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .profileImage(user.getProfileImage())
                        .build())
                .build();
    }
}
