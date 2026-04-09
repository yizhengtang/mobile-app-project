import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, saveToken, removeToken, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session on startup

  // On mount: check if a stored token is still valid
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getToken();
        if (token) {
          const { user } = await authAPI.getMe();
          setUser(user);
        }
      } catch {
        // Token expired or invalid — clear it silently
        await removeToken();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const { token, user } = await authAPI.login(email, password);
    await saveToken(token);
    setUser(user);
  }

  async function register(name, email, password) {
    const { token, user } = await authAPI.register(name, email, password);
    await saveToken(token);
    setUser(user);
  }

  async function logout() {
    await removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
