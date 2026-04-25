package com.mediconnect.notification;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPayload {
    private String title;
    private String message;
    private String type;
    private Long referenceId;
    private LocalDateTime timestamp;
}
