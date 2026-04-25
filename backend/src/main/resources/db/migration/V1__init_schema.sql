-- V1__init_schema.sql (MySQL compatible)

CREATE TABLE IF NOT EXISTS users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255),
    role            ENUM('ADMIN','DOCTOR','PATIENT') NOT NULL DEFAULT 'PATIENT',
    provider        ENUM('LOCAL','GOOGLE') NOT NULL DEFAULT 'LOCAL',
    provider_id     VARCHAR(255),
    profile_image   VARCHAR(500),
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT NOT NULL UNIQUE,
    date_of_birth     DATE,
    gender            VARCHAR(10),
    blood_group       VARCHAR(5),
    phone             VARCHAR(20),
    address           TEXT,
    medical_history   TEXT,
    emergency_contact VARCHAR(20),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctors (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL UNIQUE,
    specialization   VARCHAR(100) NOT NULL,
    license_number   VARCHAR(50) NOT NULL UNIQUE,
    experience_years INT DEFAULT 0,
    phone            VARCHAR(20),
    bio              TEXT,
    available        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id       BIGINT NOT NULL,
    doctor_id        BIGINT NOT NULL,
    appointment_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    status           ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED','RESCHEDULED') NOT NULL DEFAULT 'PENDING',
    reason           TEXT,
    notes            TEXT,
    meeting_link     VARCHAR(500),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id)  REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    doctor_id      BIGINT NOT NULL,
    patient_id     BIGINT NOT NULL,
    file_url       VARCHAR(500),
    diagnosis      TEXT,
    medications    TEXT,
    instructions   TEXT,
    valid_until    DATE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
    FOREIGN KEY (patient_id)     REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT NOT NULL,
    title        VARCHAR(200) NOT NULL,
    message      TEXT NOT NULL,
    type         ENUM('APPOINTMENT_BOOKED','APPOINTMENT_CONFIRMED','APPOINTMENT_CANCELLED',
                      'APPOINTMENT_REMINDER','PRESCRIPTION_UPLOADED','SOS_ALERT','GENERAL')
                 NOT NULL DEFAULT 'GENERAL',
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    token      VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time    ON appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);