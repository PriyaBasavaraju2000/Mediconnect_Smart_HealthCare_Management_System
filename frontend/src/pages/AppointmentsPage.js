import React, { useState, useEffect, useCallback } from 'react';
import { appointmentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG, STATUS } from '../constants';
import toast from 'react-hot-toast';

function normalizeStatus(status) {
  if (!status) return STATUS.PENDING;
  return status.toString().toUpperCase().trim();
}

function StatusBadge({ status }) {
  const s = normalizeStatus(status);
  const config = STATUS_CONFIG[s] || { badge: 'badge-stone', emoji: '?', label: s };
  return (
    <span className={`badge ${config.badge}`}>
      {config.emoji} {config.label}
    </span>
  );
}

function UpdateModal({ apt, onClose, onUpdated }) {
  const [form, setForm] = useState({
    status:      normalizeStatus(apt.status),
    notes:       apt.notes || '',
    meetingLink: apt.meetingLink || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appointmentApi.update(apt.id, form);
      toast.success('Appointment updated! Patient notified');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Manage Appointment</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--stone-400)', marginTop: 2 }}>
              Patient: <strong>{apt.patientName}</strong>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{
          background: 'var(--stone-100)', borderRadius: 'var(--radius-md)',
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--stone-600)' }}>Current:</span>
          <StatusBadge status={apt.status} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Update Status</label>
            <select className="form-select" value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              
<option value="PENDING">Pending</option>
<option value="CONFIRMED">Confirmed</option>
<option value="CANCELLED">Cancelled</option>
<option value="COMPLETED">Completed</option>
<option value="RESCHEDULED">Rescheduled</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Meeting Link (optional)</label>
            <input className="form-input" placeholder="https://meet.google.com/..."
              value={form.meetingLink}
              onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes for Patient</label>
            <textarea className="form-textarea"
              placeholder="Add instructions or remarks..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const { isDoctor, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filter, setFilter]             = useState('ALL');
  const [managing, setManaging]         = useState(null);
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(1);

  // Fix: derive doctor mode solely from the role field for a single source of truth
  const doctorMode = user?.role?.toUpperCase() === 'DOCTOR' || isDoctor;

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = doctorMode
        ? await appointmentApi.getMyDoctor(page, 10)
        : await appointmentApi.getMyPatient(page, 10);

      const raw = r?.data?.data?.content || [];
      const normalized = (Array.isArray(raw) ? raw : []).map((a) => ({
        ...a,
        status: normalizeStatus(a.status),
      }));
      setAppointments(normalized);
      setTotalPages(r?.data?.data?.totalPages || 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load appointments';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [doctorMode, page]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const tabs = ['ALL', STATUS.PENDING, STATUS.CONFIRMED, STATUS.COMPLETED, STATUS.CANCELLED, STATUS.RESCHEDULED];

  return (
    <div className="page-wrapper fade-in">
      <div style={{
        background: doctorMode ? 'var(--teal-pale)' : 'var(--sage-pale)',
        border: '1px solid var(--mint)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px', marginBottom: 16,
        fontSize: '0.82rem', color: 'var(--stone-700)',
      }}>
        {doctorMode
          ? 'Doctor view — confirm, cancel or complete appointments'
          : 'Patient view — your booked appointments'}
        {' '}<strong>({user?.name} - {user?.role})</strong>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {doctorMode ? 'Patient Appointments' : 'My Appointments'}
            </div>
            <div className="card-subtitle">
              {appointments.length} total · {counts[STATUS.CONFIRMED] || 0} confirmed · {counts[STATUS.PENDING] || 0} pending
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAppointments}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--rose-pale)', color: 'var(--rose)',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            marginBottom: 16, fontSize: '0.875rem',
          }}>
            Error: {error}
            <button onClick={fetchAppointments}
              style={{ marginLeft: 12, fontWeight: 600, textDecoration: 'underline', color: 'var(--rose)' }}>
              Retry
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map((t) => {
            const config = STATUS_CONFIG[t];
            const count = t === 'ALL' ? appointments.length : (counts[t] || 0);
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={'btn btn-sm ' + (filter === t ? 'btn-primary' : 'btn-outline')}>
                {config ? `${config.emoji} ${config.label}` : 'All'} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {filter === 'ALL' ? '📭' : (STATUS_CONFIG[filter]?.emoji || '📭')}
            </div>
            <h3>No {filter !== 'ALL' ? (STATUS_CONFIG[filter]?.label || '').toLowerCase() : ''} appointments</h3>
            <p>
              {doctorMode
                ? 'Patient appointments will appear here'
                : 'Book an appointment with a doctor to get started'}
            </p>
          </div>
        ) : (
          <div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{doctorMode ? 'Patient' : 'Doctor'}</th>
                    <th>Specialization</th>
                    <th>Date and Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <tr key={apt.id}>
                      <td style={{ color: 'var(--stone-400)', fontSize: '0.8rem' }}>#{apt.id}</td>
                      <td>
                        <strong>
                          {doctorMode ? apt.patientName : `Dr. ${apt.doctorName}`}
                        </strong>
                      </td>
                      <td style={{ color: 'var(--stone-400)', fontSize: '0.82rem' }}>
                        {apt.doctorSpecialization || '-'}
                      </td>
                      <td style={{ fontSize: '0.83rem' }}>
                        {apt.appointmentTime
                          ? new Date(apt.appointmentTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                          : '-'}
                      </td>
                      <td style={{ color: 'var(--stone-400)', fontSize: '0.82rem' }}>
                        {apt.durationMinutes} min
                      </td>
                      <td><StatusBadge status={apt.status} /></td>
                      <td style={{ color: 'var(--stone-400)', fontSize: '0.82rem', maxWidth: 160 }}>
                        {apt.reason ? apt.reason.slice(0, 40) : '-'}
                      </td>
                      <td>
                        {doctorMode ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => setManaging(apt)}>
                            Manage
                          </button>
                        ) : (
                          apt.meetingLink
                            ? <a href={apt.meetingLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Join</a>
                            : <span style={{ color: 'var(--stone-400)', fontSize: '0.8rem' }}>
                                {apt.notes ? apt.notes.slice(0, 30) : '-'}
                              </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Page {page + 1} of {totalPages}</span>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      {managing && (
        <UpdateModal
          apt={managing}
          onClose={() => setManaging(null)}
          onUpdated={fetchAppointments}
        />
      )}
    </div>
  );
}