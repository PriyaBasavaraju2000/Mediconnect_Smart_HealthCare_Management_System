# MediConnect — React Frontend

A soft medical-themed React.js frontend for the MediConnect Spring Boot backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MediConnect Spring Boot backend running on port 8080

### Install & Run

```bash
cd mediconnect-frontend
npm install
npm start
```

App opens at: **http://localhost:3000**

The `"proxy": "http://localhost:8080"` in package.json forwards all `/api` calls to your Spring Boot backend automatically — no CORS issues!

---

## 📁 Structure

```
src/
├── context/
│   ├── AuthContext.js          # JWT auth state + login/logout
│   └── NotificationContext.js  # WebSocket + unread count
├── services/
│   └── api.js                  # Axios instance + all API calls
├── components/
│   └── layout/
│       └── AppShell.js         # Sidebar + topbar + outlet
└── pages/
    ├── LoginPage.js
    ├── RegisterPage.js
    ├── DashboardPage.js        # Role-based (Patient/Doctor)
    ├── AppointmentsPage.js     # List + manage + status tabs
    ├── DoctorsPage.js          # Browse + book appointments
    ├── PrescriptionsPage.js    # View + create prescriptions
    ├── NotificationsPage.js    # All notifications + mark read
    └── ProfilePage.js          # User info + logout
```

---

## ✨ Features

- **JWT Auth** — login, register, auto token refresh
- **Role-based views** — Patient and Doctor see different dashboards
- **Real-time notifications** — WebSocket via STOMP
- **Book appointments** — modal with datetime picker
- **Manage appointments** — doctors can confirm/cancel/complete
- **Prescriptions** — doctors create, patients view
- **Soft medical design** — pastel greens, DM Serif Display + DM Sans

---

## 🎨 Design System

Colors defined in `src/index.css` as CSS variables:
- `--sage` / `--sage-dark` — primary green
- `--cream` — page background
- `--stone-*` — neutral grays
- `--rose-pale` / `--teal-pale` — accent backgrounds

Fonts: **DM Serif Display** (headings) + **DM Sans** (body)
