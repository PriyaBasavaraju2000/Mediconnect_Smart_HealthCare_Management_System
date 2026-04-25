import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <h1>Medi<br/>Connect</h1>
          <p>Your trusted healthcare companion — connecting patients and doctors seamlessly.</p>
        </div>
        <div className="auth-features">
          {[
            { icon: '🔐', title: 'Secure & Private', desc: 'JWT-protected health records' },
            { icon: '📅', title: 'Easy Scheduling', desc: 'Book appointments in seconds' },
            { icon: '⚡', title: 'Real-time Updates', desc: 'Live notifications via WebSocket' },
          ].map(f => (
            <div key={f.title} className="auth-feature">
              <span className="auth-feature-icon">{f.icon}</span>
              <div className="auth-feature-text">
                <p>{f.title}</p>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container slide-up">
          <h2>Welcome back</h2>
          <p>Sign in to your MediConnect account</p>

          {error && (
            <div style={{ background: 'var(--rose-pale)', color: 'var(--rose)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? '⏳ Signing in...' : '→ Sign In'}
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>

          {/* Demo credentials */}
          <div style={{ marginTop: 24, padding: '14px', background: 'var(--sage-pale)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--stone-600)' }}>
            <strong style={{ color: 'var(--sage-dark)' }}>Demo tip:</strong> Register a new account to get started instantly.
          </div>
        </div>
      </div>
    </div>
  );
}
