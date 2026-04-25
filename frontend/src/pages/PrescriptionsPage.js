import React, { useState, useEffect, useCallback } from 'react';
import { prescriptionApi, appointmentApi } from '../services/api';
import { STATUS } from '../constants';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function CreateModal({ onClose, onCreated }) {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    appointmentId: '', diagnosis: '', medications: '', instructions: '', validUntil: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    appointmentApi.getMyDoctor(0, 50)
      .then(r => {
        const content = r.data.data.content || [];
        const eligible = content.filter(a =>
          [STATUS.CONFIRMED, STATUS.COMPLETED].includes(a.status?.toUpperCase?.() || a.status)
        );
        setAppointments(eligible);
      })
      .catch(() => toast.error('Could not load appointments'));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.appointmentId) { toast.error('Please select an appointment'); return; }
    setLoading(true);
    try {
      await prescriptionApi.create({ ...form, appointmentId: parseInt(form.appointmentId) });
      toast.success('Prescription created & patient notified! 💊');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Prescription</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--stone-400)', marginTop: 2 }}>
              Only confirmed or completed appointments are shown
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Appointment</label>
            <select className="form-select" value={form.appointmentId}
              onChange={e => setForm(f => ({ ...f, appointmentId: e.target.value }))} required>
              <option value="">Select appointment...</option>
              {appointments.length === 0 && <option disabled>No confirmed appointments found</option>}
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.patientName} — {new Date(a.appointmentTime).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ({a.status})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Diagnosis</label>
            <textarea className="form-textarea" placeholder="Primary diagnosis and findings..."
              value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Medications</label>
            <textarea className="form-textarea"
              placeholder={"e.g. Paracetamol 500mg — twice daily\nVitamin C 1000mg — once daily"}
              value={form.medications} onChange={e => setForm(f => ({ ...f, medications: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Instructions</label>
            <textarea className="form-textarea" placeholder="Special instructions, diet, rest, follow-up..."
              value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Valid Until (optional)</label>
            <input className="form-input" type="date" value={form.validUntil}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Creating...' : '💊 Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrescriptionCard({ p, isDoctor }) {
  const [open, setOpen] = useState(false);
  const details = [
    { label: '🩺 Diagnosis',    value: p.diagnosis },
    { label: '👤 Patient',      value: p.patientName },
    { label: '👨‍⚕️ Doctor',      value: p.doctorName ? 'Dr. ' + p.doctorName : null },
    { label: '💊 Medications',  value: p.medications },
    { label: '📋 Instructions', value: p.instructions },
  ].filter(item => item.value);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
            💊 Prescription #{p.id}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--stone-400)' }}>
            {isDoctor
              ? <span>For <strong style={{ color: 'var(--stone-700)' }}>{p.patientName}</strong></span>
              : <span>By <strong style={{ color: 'var(--stone-700)' }}>Dr. {p.doctorName}</strong></span>
            }
            {' · '}
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {p.validUntil && (
            <span className="badge badge-green">
              ✅ Valid till {new Date(p.validUntil).toLocaleDateString('en-IN')}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)}>
            {open ? '▲ Hide' : '▼ View Details'}
          </button>
        </div>
      </div>

      {open && (
        <div className="fade-in" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--stone-200)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {details.map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--stone-400)', marginBottom: 5 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--stone-800)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const { isDoctor } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(1);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Doctor → /prescriptions/doctor/my | Patient → /prescriptions/my
      const r = isDoctor
        ? await prescriptionApi.getDoctorPrescriptions(page, 10)
        : await prescriptionApi.getMine(page, 10);
      setPrescriptions(r.data.data.content || []);
      setTotalPages(r.data.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      toast.error('Could not load prescriptions');
    } finally { setLoading(false); }
  }, [isDoctor, page]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="section-title">
            {isDoctor ? '📋 Prescriptions Issued' : '💊 My Prescriptions'}
          </h2>
          <p className="text-muted">
            {loading ? 'Loading...' : `${prescriptions.length} prescription${prescriptions.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {isDoctor && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Prescription
          </button>
        )}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : prescriptions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💊</div>
            <h3>No prescriptions yet</h3>
            <p>
              {isDoctor
                ? 'Confirm an appointment first, then create a prescription'
                : 'Your doctor will add prescriptions after your visit'}
            </p>
            {isDoctor && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
                + Create First Prescription
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {prescriptions.map(p => <PrescriptionCard key={p.id} p={p} isDoctor={isDoctor} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--stone-600)' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={loadPrescriptions} />}
    </div>
  );
}