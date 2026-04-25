import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentApi } from '../services/api';
import { STATUS_CONFIG, STATUS } from '../constants';

function QuickStat({ icon, value, label, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isDoctor } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
  // FIX: admin has no appointments, skip fetch
  if (!user?.role || user.role === 'ADMIN') {
    setLoading(false);
    return;
  }

  const loadAppointments = isDoctor
    ? () => appointmentApi.getMyDoctor(0, 5)
    : () => appointmentApi.getMyPatient(0, 5);

  loadAppointments()
    .then(r => setAppointments(r.data.data.content || []))
    .catch(err => {
      setError('Failed to load appointments');
      console.error(err);
    })
    .finally(() => setLoading(false));
}, [isDoctor, user]);

  const pending   = appointments.filter(a => a.status === STATUS.PENDING).length;
  const confirmed = appointments.filter(a => a.status === STATUS.CONFIRMED).length;
  const completed = appointments.filter(a => a.status === STATUS.COMPLETED).length;
  const upcoming  = appointments.filter(a => [STATUS.PENDING, STATUS.CONFIRMED].includes(a.status));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-wrapper fade-in">
      {/* Hero greeting */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sage-dark), var(--sage))',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {greeting()},
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', lineHeight: 1.2 }}>
            {user?.name} 👋
          </h1>
          <p style={{ opacity: 0.8, marginTop: 6, fontSize: '0.9rem' }}>
            {isDoctor
              ? `You have ${upcoming.length} upcoming appointment${upcoming.length !== 1 ? 's' : ''} today`
              : `Here's your health overview`}
          </p>
        </div>
        <div style={{ fontSize: '5rem', opacity: 0.15, position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)' }}>
          {isDoctor ? '🩺' : '🌿'}
        </div>
        {!isDoctor && (
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 1 }}
            onClick={() => navigate('/doctors')}
          >
            + Book Appointment
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <QuickStat icon="📅" value={appointments.length} label="Total Appointments" color="green" />
        <QuickStat icon="⏳" value={pending}   label="Pending"   color="amber" />
        <QuickStat icon="✅" value={confirmed} label="Confirmed" color="teal" />
        <QuickStat icon="🏆" value={completed} label="Completed" color="rose" />
      </div>

      {/* Upcoming appointments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Upcoming Appointments</div>
              <div className="card-subtitle">Your next scheduled visits</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')}>
              View all →
            </button>
          </div>

          {error && (
            <div style={{ background: 'var(--rose-pale)', color: 'var(--rose)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="spinner" />
          ) : upcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No upcoming appointments</h3>
              <p>{isDoctor ? 'Your schedule is clear' : 'Book your first appointment with a doctor'}</p>
              {!isDoctor && (
                <button className="btn btn-primary" onClick={() => navigate('/doctors')}>Find a Doctor</button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{isDoctor ? 'Patient' : 'Doctor'}</th>
                    <th>Specialization</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    {isDoctor && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(apt => {
                    const config = STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr key={apt.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {isDoctor ? apt.patientName : `Dr. ${apt.doctorName}`}
                          </div>
                        </td>
                        <td style={{ color: 'var(--stone-400)' }}>{apt.doctorSpecialization}</td>
                        <td>{new Date(apt.appointmentTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td>
                          <span className={`badge ${config.badge}`}>
                            {config.emoji} {config.label}
                          </span>
                        </td>
                        {isDoctor && (
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')}>
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {(!isDoctor ? [
              { icon: '👨‍⚕️', label: 'Find Doctors',     path: '/doctors',       color: 'var(--sage-pale)' },
              { icon: '📅', label: 'My Appointments', path: '/appointments',  color: 'var(--teal-pale)' },
              { icon: '💊', label: 'Prescriptions',   path: '/prescriptions', color: 'var(--amber-pale)' },
              { icon: '🔔', label: 'Notifications',   path: '/notifications', color: 'var(--rose-pale)' },
            ] : [
              { icon: '📅', label: 'Appointments',  path: '/appointments',  color: 'var(--sage-pale)' },
              { icon: '💊', label: 'Prescriptions', path: '/prescriptions', color: 'var(--teal-pale)' },
              { icon: '🔔', label: 'Notifications', path: '/notifications', color: 'var(--amber-pale)' },
              { icon: '👤', label: 'My Profile',    path: '/profile',       color: 'var(--rose-pale)' },
            ]).map(a => (
              <button key={a.label}
                onClick={() => navigate(a.path)}
                style={{
                  background: a.color, borderRadius: 'var(--radius-md)',
                  padding: '18px 16px', textAlign: 'center',
                  border: 'none', cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{a.icon}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--stone-700)' }}>{a.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}