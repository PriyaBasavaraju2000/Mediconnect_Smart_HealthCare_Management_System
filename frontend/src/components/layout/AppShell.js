import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { notificationApi } from '../../services/api';

const adminNav = [
  { to: "/dashboard",     icon: "🏠", label: "Dashboard" },
  { to: "/admin",         icon: "⚙️", label: "User Management" },
  { to: "/notifications", icon: "🔔", label: "Notifications" },
];

const patientNav = [
  { to: '/dashboard',     icon: '🏠', label: 'Dashboard' },
  { to: '/appointments',  icon: '📅', label: 'Appointments' },
  { to: '/doctors',       icon: '👨‍⚕️', label: 'Find Doctors' },
  { to: '/prescriptions', icon: '💊', label: 'Prescriptions' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
];

const doctorNav = [
  { to: '/dashboard',     icon: '🏠', label: 'Dashboard' },
  { to: '/appointments',  icon: '📅', label: 'Appointments' },
  { to: '/prescriptions', icon: '💊', label: 'Prescriptions' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
];

export default function AppShell() {
  // ✅ FIXED: added isAdmin to destructuring
  const { user, logout, isDoctor, isAdmin } = useAuth();
  const { unreadCount, notifications, setUnreadCount, setNotifications } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef();

  const navItems = isAdmin ? adminNav : isDoctor ? doctorNav : patientNav;

  const pageTitle = navItems.find(n => location.pathname.startsWith(n.to))?.label || 'MediConnect';

  useEffect(() => {
    if (!showNotif) return;
    notificationApi.getAll(0, 8)
      .then(r => setRecentNotifs(r.data.data.content || []))
      .catch(() => {});
  }, [showNotif]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    setUnreadCount(0);
    setRecentNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Medi<span>Connect</span></h1>
          <p>Smart Patient Care</p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <div className="user-info">
            <p>{user?.name}</p>
            <span>{user?.role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
          <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">👤</span> Profile
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">{pageTitle}</h2>
          <div className="topbar-actions">
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => setShowNotif(v => !v)}
                style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  background: showNotif ? 'var(--sage-pale)' : 'var(--stone-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', position: 'relative',
                  transition: 'all var(--transition)',
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 8, height: 8,
                    background: 'var(--rose)', borderRadius: '50%',
                    border: '2px solid white',
                  }} />
                )}
              </button>

              {showNotif && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <h3>Notifications {unreadCount > 0 && <span className="badge badge-green" style={{ marginLeft: 6 }}>{unreadCount} new</span>}</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAll} style={{ fontSize: '0.75rem', color: 'var(--sage-dark)', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {recentNotifs.length === 0 ? (
                      <div className="notif-empty">🌿 All caught up!</div>
                    ) : recentNotifs.map(n => (
                      <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                        <div className={`notif-dot ${n.isRead ? 'read' : ''}`} />
                        <div className="notif-content">
                          <p>{n.title} — {n.message}</p>
                          <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--stone-200)' }}>
                    <button
                      onClick={() => { setShowNotif(false); navigate('/notifications'); }}
                      style={{ fontSize: '0.8rem', color: 'var(--sage-dark)', fontWeight: 600, width: '100%', textAlign: 'center' }}
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                {getInitials(user?.name)}
              </div>
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}