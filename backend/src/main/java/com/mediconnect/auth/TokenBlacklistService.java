package com.mediconnect.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Date;

/**
 * Manages JWT token blacklisting via Redis.
 * When a user logs out, their token is stored in Redis with a TTL
 * matching the token's remaining validity, ensuring invalidation
 * without checking the DB on every request.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "blacklist:token:";
    private final StringRedisTemplate redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Blacklist a token until it naturally expires.
     */
    public void blacklist(String token) {
        try {
            Date expiration = jwtTokenProvider.extractExpiration(token);
            long ttlMillis = expiration.getTime() - System.currentTimeMillis();

            if (ttlMillis > 0) {
                redisTemplate.opsForValue().set(
                        BLACKLIST_PREFIX + token,
                        "blacklisted",
                        Duration.ofMillis(ttlMillis)
                );
                log.debug("Token blacklisted, TTL: {}ms", ttlMillis);
            }
        } catch (Exception e) {
            log.error("Failed to blacklist token", e);
        }
    }

    /**
     * Check if a token is blacklisted.
     */
    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(
                redisTemplate.hasKey(BLACKLIST_PREFIX + token)
        );
    }
}
