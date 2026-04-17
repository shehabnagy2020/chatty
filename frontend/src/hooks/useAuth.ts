import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_SERVER_URL || '';

function isTokenExpired(t: string | null): boolean {
  if (!t) return true;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getInitialToken(): string | null {
  const t = localStorage.getItem('chatty_token') || sessionStorage.getItem('chatty_token');
  if (isTokenExpired(t)) {
    localStorage.removeItem('chatty_token');
    localStorage.removeItem('chatty_username');
    sessionStorage.removeItem('chatty_token');
    sessionStorage.removeItem('chatty_username');
    return null;
  }
  return t;
}

function getInitialUsername(): string | null {
  const t = localStorage.getItem('chatty_token') || sessionStorage.getItem('chatty_token');
  if (isTokenExpired(t)) return null;
  return localStorage.getItem('chatty_username') || sessionStorage.getItem('chatty_username');
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [username, setUsername] = useState<string | null>(getInitialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAuth = useCallback((accessToken: string, user: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem('chatty_token', accessToken);
      localStorage.setItem('chatty_username', user);
      sessionStorage.removeItem('chatty_token');
      sessionStorage.removeItem('chatty_username');
    } else {
      sessionStorage.setItem('chatty_token', accessToken);
      sessionStorage.setItem('chatty_username', user);
      localStorage.removeItem('chatty_token');
      localStorage.removeItem('chatty_username');
    }
    setToken(accessToken);
    setUsername(user);
    setError(null);
  }, []);

  const register = useCallback(async (user: string, password: string, remember: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password, rememberMe: remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      saveAuth(data.accessToken, data.username, remember);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const login = useCallback(async (user: string, password: string, remember: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password, rememberMe: remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      saveAuth(data.accessToken, data.username, remember);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('chatty_token');
    localStorage.removeItem('chatty_username');
    sessionStorage.removeItem('chatty_token');
    sessionStorage.removeItem('chatty_username');
    setToken(null);
    setUsername(null);
  }, []);

  return { token, username, loading, error, register, login, logout, setError };
}