import React, { useState, useEffect } from 'react';
import { doctorApi, appointmentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function BookModal({ doctor, onClose, onBooked }) {
  const [form, setForm] = useState({ appointmentTime: '', reason: '', durationMinutes: 30 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appointmentApi.book({ doctorId: doctor.id, ...form });
      toast.success('Appointment booked! 🎉');
      onBooked();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Book Appointment</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--stone-400)', marginTop: 2 }}>
              with Dr. {doctor.name} · {doctor.specialization}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Date & Time</label>
            <input className="form-input" type="datetime-local"
              value={form.appointmentTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Duration</label>
            <select className="form-select" value={form.durationMinutes}
              onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Visit</label>
            <textarea className="form-textarea" placeholder="Briefly describe your symptoms or reason..."
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Booking...' : '✓ Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const { isDoctor } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    doctorApi.getAll()
      .then(r => { setDoctors(r.data.data); setFiltered(r.data.data); })
      .catch(err => {
        setError('Failed to load doctors');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(doctors.filter(d =>
      d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)
    ));
  }, [search, doctors]);

  const toggleAvailability = async (val) => {
    try {
      await doctorApi.toggleAvailability(val);
      toast.success(`You are now ${val ? 'available' : 'unavailable'}`);
      setAvailability(val);
    } catch {
      toast.error('Failed to update availability');
    }
  };

  const getInitials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const specializations = [...new Set(doctors.map(d => d.specialization))];

  return (
    <div className="page-wrapper fade-in">
      {isDoctor && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Availability Status</div>
              <div className="card-subtitle">Toggle your availability for new appointments</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className={`btn ${availability !== false ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => toggleAvailability(true)}>
              ✅ Set Available
            </button>
            <button className={`btn ${availability === false ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => toggleAvailability(false)}>
              🔴 Set Unavailable
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Find a Doctor</div>
            <div className="card-subtitle">{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} available</div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--rose-pale)', color: 'var(--rose)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ maxWidth: 320 }}
            placeholder="🔍  Search by name or specialization..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 200 }}
            onChange={e => setSearch(e.target.value)}>
            <option value="">All Specializations</option>
            {specializations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No doctors found</h3>
            <p>Try a different search term</p>
          </div>
        ) : (
          <div className="doctor-grid">
            {filtered.map(doc => (
              <div key={doc.id} className="doctor-card">
                <div className="doctor-avatar">{getInitials(doc.name)}</div>
                <div className="doctor-name">Dr. {doc.name}</div>
                <div className="doctor-spec">{doc.specialization}</div>
                <div className="doctor-meta">
                  <div className="doctor-meta-item">
                    <span className={`availability-dot ${doc.available ? 'available' : 'unavailable'}`} />
                    {doc.available ? 'Available' : 'Unavailable'}
                  </div>
                  {doc.experienceYears > 0 && (
                    <div className="doctor-meta-item">⭐ {doc.experienceYears}y exp</div>
                  )}
                </div>
                {doc.bio && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--stone-400)', marginBottom: 14, lineHeight: 1.5 }}>
                    {doc.bio.slice(0, 80)}{doc.bio.length > 80 ? '...' : ''}
                  </p>
                )}
                {!isDoctor && (
                  <button
                    className={`btn ${doc.available ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={!doc.available}
                    onClick={() => setSelected(doc)}
                  >
                    {doc.available ? '📅 Book Appointment' : 'Not Available'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <BookModal
          doctor={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {}}
        />
      )}
    </div>
  );
}