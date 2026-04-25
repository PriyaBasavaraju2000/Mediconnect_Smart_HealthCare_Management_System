import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();

  const getInitials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="page-wrapper fade-in">
      <div style={{ maxWidth: 600 }}>

        {/* Profile Header Card */}
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: '36px 32px' }}>
          <div style={{
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--sage-dark), var(--sage))',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.8rem',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-md)',
          }}>
            {getInitials(user?.name)}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>
            {isDoctor ? 'Dr. ' : ''}{user?.name}
          </h2>
          <p style={{ color: 'var(--stone-400)', fontSize: '0.85rem', marginBottom: 12 }}>{user?.email}</p>
          <span className={`badge ${isDoctor ? 'badge-teal' : isPatient ? 'badge-green' : 'badge-stone'}`}
            style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
            {isDoctor ? '👨‍⚕️ Doctor' : isPatient ? '🧑‍💼 Patient' : '🔧 Admin'}
          </span>
        </div>

        {/* Info Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Account Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Full Name',  value: user?.name,  icon: '👤' },
              { label: 'Email',      value: user?.email, icon: '📧' },
              { label: 'Role',       value: user?.role,  icon: '🏷️' },
              { label: 'User ID',    value: `#${user?.id}`, icon: '🔑' },
              { label: 'Login Type', value: user?.provider || 'LOCAL', icon: '🔐' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--stone-100)' }}>
                <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--stone-400)', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Quick Navigation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '📅', label: 'Appointments',  path: '/appointments' },
              { icon: '💊', label: 'Prescriptions', path: '/prescriptions' },
              { icon: '🔔', label: 'Notifications', path: '/notifications' },
              ...(!isDoctor ? [{ icon: '👨‍⚕️', label: 'Find Doctors', path: '/doctors' }] : []),
            ].map(l => (
              <button key={l.label}
                onClick={() => navigate(l.path)}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span>{l.icon}</span> {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Session</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--stone-400)', marginBottom: 16 }}>
            You are currently signed in as <strong>{user?.email}</strong>
          </p>
          <button className="btn btn-danger" onClick={handleLogout} style={{ gap: 8 }}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}