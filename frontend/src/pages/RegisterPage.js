import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(ROLES.PATIENT);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    specialization: '', licenseNumber: '', experienceYears: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, role };
      if (role === ROLES.DOCTOR) {
        payload.experienceYears = parseInt(form.experienceYears) || 0;
      }
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <h1>Join Medi<br/>Connect</h1>
          <p>Create your account and start managing your healthcare journey today.</p>
        </div>
        <div className="auth-features">
          {[
            { icon: '👨‍⚕️', title: 'For Doctors',           desc: 'Manage patients & prescriptions' },
            { icon: '🧑‍💼', title: 'For Patients',           desc: 'Book appointments, track health' },
            { icon: '💊',   title: 'Digital Prescriptions', desc: 'Access anytime, anywhere' },
          ].map(f => (
            <div key={f.title} className="auth-feature">
              <span className="auth-feature-icon">{f.icon}</span>
              <div className="auth-feature-text"><p>{f.title}</p><span>{f.desc}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container slide-up" style={{ maxWidth: 460 }}>
          <h2>Create account</h2>
          <p>Join thousands of patients and doctors on MediConnect</p>

          {error && (
            <div style={{ background: 'var(--rose-pale)', color: 'var(--rose)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div className="role-selector">
              <div className={`role-option ${role === ROLES.PATIENT ? 'selected' : ''}`} onClick={() => setRole(ROLES.PATIENT)}>
                <span className="role-icon">🧑‍💼</span>
                <p>Patient</p>
                <span>Book & manage care</span>
              </div>
              <div className={`role-option ${role === ROLES.DOCTOR ? 'selected' : ''}`} onClick={() => setRole(ROLES.DOCTOR)}>
                <span className="role-icon">👨‍⚕️</span>
                <p>Doctor</p>
                <span>Provide care</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="name" placeholder="Dr. Sarah Johnson" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" name="password" placeholder="Min 8 chars" value={form.password} onChange={handleChange} required />
              </div>
            </div>

            {role === ROLES.DOCTOR && (
              <div className="fade-in">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input className="form-input" name="specialization" placeholder="e.g. Cardiology" value={form.specialization} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Experience (yrs)</label>
                    <input className="form-input" type="number" name="experienceYears" placeholder="5" value={form.experienceYears} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">License Number</label>
                  <input className="form-input" name="licenseNumber" placeholder="MED-12345" value={form.licenseNumber} onChange={handleChange} required />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? '⏳ Creating account...' : '→ Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}