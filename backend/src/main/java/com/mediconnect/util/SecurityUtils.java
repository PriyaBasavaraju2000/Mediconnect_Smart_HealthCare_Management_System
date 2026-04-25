package com.mediconnect.util;

import com.mediconnect.exception.BadRequestException;
import com.mediconnect.user.User;
import com.mediconnect.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Utility for extracting the currently authenticated user
 * from Spring Security's SecurityContext.
 */
public class SecurityUtils {

    private SecurityUtils() {}

    public static String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BadRequestException("No authenticated user found");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return principal.toString();
    }

    public static Long getCurrentUserId() {
        Long id = CurrentUserHolder.getUserId();
        if (id == null) {
            // Fallback: try to get from SecurityContext directly
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails userDetails) {
                throw new BadRequestException(
                        "User ID not in context for: " + userDetails.getUsername() +
                                ". Check CurrentUserFilter is registered.");
            }
            throw new BadRequestException("No authenticated user found in context");
        }
        return id;
    }

    /**
     * ThreadLocal holder for current user ID.
     * Set by CurrentUserFilter on each request.
     */
    public static class CurrentUserHolder {
        private static final ThreadLocal<Long> userIdHolder = new ThreadLocal<>();

        public static void setUserId(Long userId) {
            userIdHolder.set(userId);
        }

        public static Long getUserId() {
            Long id = userIdHolder.get();
            if (id == null) throw new BadRequestException("User ID not available in context");
            return id;
        }

        public static void clear() {
            userIdHolder.remove();
        }
    }
}
