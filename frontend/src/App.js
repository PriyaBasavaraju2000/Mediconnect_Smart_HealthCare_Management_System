import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppShell from './components/layout/AppShell';

import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardPage     from './pages/DashboardPage';
import AppointmentsPage  from './pages/AppointmentsPage';
import DoctorsPage       from './pages/DoctorsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage       from './pages/ProfilePage';
import AdminPage         from './pages/AdminPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.875rem',
                borderRadius: '12px',
                border: '1px solid #E8E6E0',
                boxShadow: '0 4px 16px rgba(126,169,130,0.15)',
              },
              success: { iconTheme: { primary: '#7CA982', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"     element={<DashboardPage />} />
              <Route path="appointments"  element={<AppointmentsPage />} />
              <Route path="doctors"       element={<DoctorsPage />} />
              <Route path="prescriptions" element={<PrescriptionsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile"       element={<ProfilePage />} />
              <Route path="admin"         element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}