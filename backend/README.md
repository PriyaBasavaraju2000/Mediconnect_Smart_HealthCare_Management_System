# 🏥 MediConnect — Smart Patient Care Platform

A production-grade Spring Boot healthcare management system featuring **JWT + OAuth2 security**, **real-time WebSocket notifications**, role-based access control, and clean layered architecture.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.2, Java 17 |
| Security | Spring Security + JWT (JJWT 0.12) + Google OAuth2 |
| Real-time | Spring WebSocket + STOMP protocol |
| Database | PostgreSQL + Spring Data JPA + Flyway migrations |
| Caching | Redis (token blacklisting) |
| API Docs | Swagger UI / OpenAPI 3 |
| Build | Maven |
| Container | Docker + Docker Compose |

---

## 📁 Project Structure

```
src/main/java/com/mediconnect/
├── MediConnectApplication.java
├── config/
│   ├── SecurityConfig.java       # JWT + OAuth2 + CORS setup
│   ├── WebSocketConfig.java      # STOMP broker + JWT auth
│   ├── RedisConfig.java
│   └── OpenApiConfig.java        # Swagger config
├── auth/
│   ├── JwtTokenProvider.java     # Token generation & validation
│   ├── JwtAuthenticationFilter.java
│   ├── TokenBlacklistService.java # Redis-based logout
│   ├── OAuth2SuccessHandler.java  # Google login callback
│   ├── AuthService.java
│   ├── AuthController.java
│   ├── AuthDtos.java
│   ├── RefreshToken.java
│   ├── RefreshTokenRepository.java
│   └── CustomUserDetailsService.java
├── user/
│   ├── User.java / Patient.java / Doctor.java
│   ├── UserRepository.java
│   └── DoctorController.java
├── appointment/
│   ├── Appointment.java
│   ├── AppointmentRepository.java
│   ├── AppointmentService.java   # Conflict detection, reminders
│   └── AppointmentController.java
├── prescription/
│   └── PrescriptionController.java  # Entity + Service + Controller
├── notification/
│   ├── Notification.java
│   ├── NotificationService.java  # WebSocket push + DB persist
│   └── NotificationController.java
├── exception/
│   ├── GlobalExceptionHandler.java
│   ├── ResourceNotFoundException.java
│   └── BadRequestException.java
└── util/
    ├── ApiResponse.java          # Unified API response wrapper
    ├── SecurityUtils.java
    └── CurrentUserFilter.java
```

---

## ⚡ Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start everything (app + postgres + redis)
git clone https://github.com/your-username/mediconnect.git
cd mediconnect

# Add your Google OAuth2 credentials to docker-compose.yml
# Then run:
docker-compose up --build
```

App will be live at: `http://localhost:8080`

### Option 2: Run Locally

**Prerequisites:** Java 17, Maven, PostgreSQL, Redis

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE mediconnect_db;"

# 2. Set environment variables
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export REDIS_HOST=localhost
export JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
export GOOGLE_CLIENT_ID=your-client-id
export GOOGLE_CLIENT_SECRET=your-client-secret

# 3. Run
mvn spring-boot:run
```

---

## 📖 API Documentation

Swagger UI: `http://localhost:8080/swagger-ui.html`
OpenAPI JSON: `http://localhost:8080/api-docs`

---

## 🔐 Authentication Flow

### 1. Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "role": "PATIENT"
}
```

### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePass123"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "user": { "id": 1, "name": "John Doe", "role": "PATIENT" }
  }
}
```

### 3. Use Token
```http
Authorization: Bearer eyJhbGciOi...
```

### 4. Refresh Token
```http
POST /api/v1/auth/refresh
{ "refreshToken": "eyJhbGciOi..." }
```

### 5. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOi...
```
Token is blacklisted in Redis immediately.

### 6. Google OAuth2
```
GET /oauth2/authorize/google
→ Redirects to Google login
→ Callback: /oauth2/callback/google
→ Redirects to frontend with tokens
```

---

## ⚡ WebSocket — Real-Time Notifications

### Connect (JavaScript/SockJS)
```javascript
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

stompClient.connect(
  { Authorization: 'Bearer ' + accessToken },
  () => {
    // Subscribe to personal notifications
    stompClient.subscribe('/user/queue/notifications', (msg) => {
      const notification = JSON.parse(msg.body);
      console.log('🔔 New notification:', notification);
    });

    // Subscribe to SOS broadcasts (doctors)
    stompClient.subscribe('/topic/doctors.sos', (msg) => {
      console.log('🚨 SOS Alert:', JSON.parse(msg.body));
    });
  }
);
```

### Notification Payload
```json
{
  "title": "Appointment Confirmed",
  "message": "Your appointment with Dr. Smith is confirmed",
  "type": "APPOINTMENT_CONFIRMED",
  "referenceId": 42,
  "timestamp": "2024-01-15T10:30:00"
}
```

---

## 📋 API Endpoints

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/logout` | Authenticated |

### Doctors
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/doctors` | Public |
| GET | `/api/v1/doctors/{id}` | Public |
| GET | `/api/v1/doctors/search?specialization=` | Public |
| PATCH | `/api/v1/doctors/availability` | DOCTOR |

### Appointments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/appointments` | PATIENT |
| GET | `/api/v1/appointments/{id}` | Authenticated |
| PATCH | `/api/v1/appointments/{id}` | DOCTOR / ADMIN |
| GET | `/api/v1/appointments/my` | PATIENT |
| GET | `/api/v1/appointments/doctor/my` | DOCTOR |

### Prescriptions
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/prescriptions` | DOCTOR |
| GET | `/api/v1/prescriptions/{id}` | Authenticated |
| GET | `/api/v1/prescriptions/my` | PATIENT |

### Notifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/notifications` | Authenticated |
| GET | `/api/v1/notifications/unread-count` | Authenticated |
| PATCH | `/api/v1/notifications/{id}/read` | Authenticated |
| PATCH | `/api/v1/notifications/read-all` | Authenticated |

---

## 🧪 Running Tests

```bash
mvn test
```

---

## 🌟 Key Features for Resume

- ✅ **JWT Access + Refresh Token rotation** with Redis blacklisting on logout
- ✅ **Google OAuth2** social login with auto profile creation
- ✅ **STOMP over WebSocket** for real-time push notifications
- ✅ **Role-Based Access Control** (ADMIN, DOCTOR, PATIENT) with `@PreAuthorize`
- ✅ **Appointment conflict detection** with custom JPQL queries
- ✅ **Scheduled reminders** 15 minutes before appointments
- ✅ **SOS broadcast** to all doctors via WebSocket topic
- ✅ **Flyway DB migrations** for version-controlled schema
- ✅ **Global exception handling** with consistent API response shape
- ✅ **Swagger/OpenAPI 3** auto-generated documentation
- ✅ **Docker + Docker Compose** for one-command deployment

---

## 📝 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `REDIS_HOST` | `localhost` | Redis host |
| `JWT_SECRET` | (see yml) | 256-bit Base64 secret |
| `GOOGLE_CLIENT_ID` | — | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth2 Client Secret |
| `FRONTEND_URL` | `http://localhost:3000` | OAuth2 redirect base URL |
