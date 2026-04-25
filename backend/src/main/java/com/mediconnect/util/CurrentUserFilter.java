package com.mediconnect.util;

import com.mediconnect.auth.JwtAuthenticationFilter;
import com.mediconnect.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs after JwtAuthenticationFilter.
 * Looks up the current user's DB ID and stores it in a ThreadLocal
 * so SecurityUtils.getCurrentUserId() works without injecting UserRepository everywhere.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetails userDetails) {
                userRepository.findByEmail(userDetails.getUsername())
                        .ifPresent(user -> SecurityUtils.CurrentUserHolder.setUserId(user.getId()));
            }
            filterChain.doFilter(request, response);
        } finally {
            SecurityUtils.CurrentUserHolder.clear(); // Always clean up ThreadLocal
        }
    }
}
