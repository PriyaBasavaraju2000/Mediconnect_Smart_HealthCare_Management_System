import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const adminApi = {
  getStats:     ()            => api.get('/admin/stats'),
  getAllUsers:   (p, s, role) => api.get(`/admin/users?page=${p}&size=${s}&role=${role}`),
  createUser:   (data)        => api.post('/admin/users', data),
  updateUser:   (id, data)    => api.put(`/admin/users/${id}`, data),
  toggleStatus: (id)          => api.patch(`/admin/users/${id}/toggle-status`),
  deleteUser:   (id)          => api.delete(`/admin/users/${id}`),
};

const ROLE_BADGE = {
  ADMIN:   { color: '#7C3AED', bg: '#EDE9FE', label: 'Admin' },
  DOCTOR:  { color: '#0D9488', bg: '#CCFBF1', label: 'Doctor' },
  PATIENT: { color: '#16A34A', bg: '#DCFCE7', label: 'Patient' },
};

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '20px 24px',
      border: '1px solid var(--stone-200)', boxShadow: 'var(--shadow-sm)',
      borderLeft: '4px solid ' + color,
    }}>
      <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--stone-800)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PATIENT', specialization: '', licenseNumber: '', experienceYears: '', phone: '', bloodGroup: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.createUser({ ...form, experienceYears: parseInt(form.experienceYears) || 0 });
      toast.success('User created successfully!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Create New User</div>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="user@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
          </div>

          {form.role === 'DOCTOR' && (
            <div className="fade-in">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-input" placeholder="Cardiology" value={form.specialization} onChange={e => set('specialization', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (yrs)</label>
                  <input className="form-input" type="number" placeholder="5" value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input className="form-input" placeholder="MED-12345" value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} required />
              </div>
            </div>
          )}

          {form.role === 'PATIENT' && (
            <div className="fade-in">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: user.name || '', email: user.email || '',
    enabled: user.enabled,
    specialization: user.specialization || '',
    experienceYears: user.experienceYears || '',
    available: user.available,
    phone: user.phone || '',
    bloodGroup: user.bloodGroup || '',
    gender: user.gender || '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.updateUser(user.id, form);
      toast.success('User updated!');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit User</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--stone-400)', marginTop: 2 }}>{user.email} - {user.role}</div>
          </div>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select className="form-select" value={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.value === 'true' }))}>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          {user.role === 'DOCTOR' && (
            <div className="fade-in">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-input" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (yrs)</label>
                  <input className="form-input" type="number" value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Availability</label>
                <select className="form-select" value={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.value === 'true' }))}>
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
            </div>
          )}

          {user.role === 'PATIENT' && (
            <div className="fade-in">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

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

function DeleteConfirmModal({ user, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await adminApi.deleteUser(user.id);
      toast.success(user.name + ' deleted successfully');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗑️</div>
          <div className="modal-title" style={{ marginBottom: 8 }}>Delete User?</div>
          <p style={{ color: 'var(--stone-600)', fontSize: '0.9rem' }}>
            Are you sure you want to permanently delete <strong>{user.name}</strong>?
            This will also delete all their appointments and prescriptions.
          </p>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={confirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]         = useState({});
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleting, setDeleting]   = useState(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    adminApi.getStats().then(r => setStats(r.data.data)).catch(() => {});
  }, [isAdmin, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getAllUsers(page, 10, roleFilter);
      setUsers(r.data.data.content || []);
      setTotalPages(r.data.data.totalPages || 1);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggle = async (userId) => {
    try {
      const r = await adminApi.toggleStatus(userId);
      const updated = r.data.data;
      toast.success(updated.name + ' is now ' + (updated.enabled ? 'active' : 'disabled'));
      loadUsers();
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="page-wrapper fade-in">

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="👥" value={stats.totalUsers    || 0} label="Total Users"    color="var(--sage)" />
        <StatCard icon="👨‍⚕️" value={stats.totalDoctors  || 0} label="Total Doctors"  color="var(--teal)" />
        <StatCard icon="🧑‍💼" value={stats.totalPatients || 0} label="Total Patients" color="#7C3AED" />
        <StatCard icon="✅" value={stats.activeUsers   || 0} label="Active Users"   color="var(--amber)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">User Management</div>
            <div className="card-subtitle">{users.length} users shown</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Add User
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ maxWidth: 280 }}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {['ALL', 'PATIENT', 'DOCTOR', 'ADMIN'].map(r => (
            <button key={r}
              className={'btn btn-sm ' + (roleFilter === r ? 'btn-primary' : 'btn-outline')}
              onClick={() => { setRoleFilter(r); setPage(0); }}>
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No users found</h3>
            <p>Try a different filter or add a new user</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const roleStyle = ROLE_BADGE[u.role] || ROLE_BADGE.PATIENT;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--sage-pale)', color: 'var(--sage-dark)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.78rem', flexShrink: 0,
                          }}>
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--stone-400)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          background: roleStyle.bg, color: roleStyle.color,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.7rem', fontWeight: 700,
                        }}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--stone-500)' }}>
                        {u.role === 'DOCTOR' && u.specialization && (
                          <span>{u.specialization} {u.experienceYears ? '· ' + u.experienceYears + 'y' : ''}</span>
                        )}
                        {u.role === 'PATIENT' && (
                          <span>{u.bloodGroup || ''} {u.gender || ''}</span>
                        )}
                        {u.role === 'ADMIN' && <span>Administrator</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggle(u.id)}
                          style={{
                            padding: '3px 10px', borderRadius: 999,
                            fontSize: '0.7rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                            background: u.enabled ? 'var(--sage-pale)' : 'var(--rose-pale)',
                            color: u.enabled ? 'var(--sage-dark)' : 'var(--rose)',
                          }}>
                          {u.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--stone-400)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(u)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleting(u)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--stone-600)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadUsers} />}
      {editing   && <EditUserModal   user={editing} onClose={() => setEditing(null)} onUpdated={loadUsers} />}
      {deleting  && <DeleteConfirmModal user={deleting} onClose={() => setDeleting(null)} onDeleted={loadUsers} />}
    </div>
  );
}