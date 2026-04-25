package com.mediconnect.auth;

import com.mediconnect.user.Patient;
import com.mediconnect.user.PatientRepository;
import com.mediconnect.user.User;
import com.mediconnect.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");
        String googleId = oAuth2User.getAttribute("sub");

        // Find existing user or create new one
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .name(name)
                            .email(email)
                            .provider(User.AuthProvider.GOOGLE)
                            .providerId(googleId)
                            .profileImage(picture)
                            .role(User.Role.PATIENT)
                            .build();
                    newUser = userRepository.save(newUser);

                    // Auto-create patient profile for Google users
                    Patient patient = Patient.builder().user(newUser).build();
                    patientRepository.save(patient);

                    log.info("New user registered via Google OAuth2: {}", email);
                    return newUser;
                });

        // Update profile image if changed
        if (picture != null && !picture.equals(user.getProfileImage())) {
            user.setProfileImage(picture);
            userRepository.save(user);
        }

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail());
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(user.getEmail());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiry / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        // Redirect to frontend with tokens in query params
        // In production, prefer httpOnly cookies over query params
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshTokenStr)
                .build().toUriString();

        log.info("OAuth2 login successful for: {}", email);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
