import React, { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

const TYPE_EMOJI = {
  APPOINTMENT_BOOKED:    '📅',
  APPOINTMENT_CONFIRMED: '✅',
  APPOINTMENT_CANCELLED: '❌',
  APPOINTMENT_REMINDER:  '⏰',
  PRESCRIPTION_UPLOADED: '💊',
  SOS_ALERT:             '🚨',
  GENERAL:               '🔔',
};

const TYPE_BADGE = {
  APPOINTMENT_BOOKED:    'badge-green',
  APPOINTMENT_CONFIRMED: 'badge-teal',
  APPOINTMENT_CANCELLED: 'badge-rose',
  APPOINTMENT_REMINDER:  'badge-amber',
  PRESCRIPTION_UPLOADED: 'badge-green',
  SOS_ALERT:             'badge-rose',
  GENERAL:               'badge-stone',
};

export default function NotificationsPage() {
  const { setUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await notificationApi.getAll(page, 15);
      setNotifications(r.data.data.content || []);
      setTotalPages(r.data.data.totalPages || 1);
    } catch (err) {
      setError('Could not load notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const markOne = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="page-wrapper fade-in">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Notifications</div>
            <div className="card-subtitle">{unread > 0 ? `${unread} unread` : 'All caught up!'}</div>
          </div>
          {unread > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAll}>✓ Mark all read</button>
          )}
        </div>

        {error && (
          <div style={{ background: 'var(--rose-pale)', color: 'var(--rose)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.875rem' }}>
            {error}
            <button onClick={fetchNotifs} style={{ marginLeft: 12, fontWeight: 600, textDecoration: 'underline', color: 'var(--rose)' }}>
              Retry
            </button>
          </div>
        )}

        {loading ? <div className="spinner" /> : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌿</div>
            <h3>All clear!</h3>
            <p>No notifications to show</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {notifications.map(n => (
              <div key={n.id}
                onClick={() => !n.isRead && markOne(n.id)}
                style={{
                  display: 'flex', gap: 14, padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: !n.isRead ? 'var(--sage-pale)' : 'transparent',
                  cursor: !n.isRead ? 'pointer' : 'default',
                  transition: 'background var(--transition)',
                  border: !n.isRead ? '1px solid var(--mint)' : '1px solid transparent',
                }}>
                <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>
                  {TYPE_EMOJI[n.type] || '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: !n.isRead ? 700 : 500, fontSize: '0.9rem' }}>{n.title}</span>
                    <span className={`badge ${TYPE_BADGE[n.type] || 'badge-stone'}`} style={{ fontSize: '0.6rem' }}>
                      {n.type?.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>NEW</span>}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--stone-600)', marginBottom: 4 }}>{n.message}</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--stone-400)' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}
                  </span>
                </div>
                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--stone-600)' }}>Page {page + 1}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}