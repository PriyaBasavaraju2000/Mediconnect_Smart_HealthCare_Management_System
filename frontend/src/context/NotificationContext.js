import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationApi } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const stompRef = useRef(null);

  // Fetch unread count on mount
  useEffect(() => {
    if (!user) return;
    notificationApi.getUnread()
      .then(r => setUnreadCount(r.data.data.count))
      .catch(() => {});
  }, [user]);

  // WebSocket connection
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const client = new Client({
      // Use token in URL so the proxy can pass it through to backend
      webSocketFactory: () => new SockJS(`/ws?token=${token}`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/user/queue/notifications`, (msg) => {
          const payload = JSON.parse(msg.body);
          setUnreadCount(prev => prev + 1);
          setNotifications(prev => [{ ...payload, id: Date.now(), isRead: false }, ...prev]);
          toast(`🔔 ${payload.title}`, {
            style: { background: '#EAF2EB', color: '#2E2C28' },
          });
        });
      },
      onDisconnect: () => {},
    });

    client.activate();
    stompRef.current = client;

    return () => { try { client.deactivate(); } catch {} };
  }, [user]);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, notifications, setNotifications, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);