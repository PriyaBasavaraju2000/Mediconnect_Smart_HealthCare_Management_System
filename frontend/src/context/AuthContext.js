import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('accessToken');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    const { accessToken, refreshToken, user: u } = data.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    toast.success(`Welcome back, ${u.name.split(' ')[0]}! 👋`);
    return u;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    const { accessToken, refreshToken, user: u } = data.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    toast.success(`Welcome to MediConnect, ${u.name.split(' ')[0]}! 🎉`);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    localStorage.clear();
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const isPatient = user?.role === 'PATIENT';
  const isDoctor  = user?.role === 'DOCTOR';
  const isAdmin   = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPatient, isDoctor, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
