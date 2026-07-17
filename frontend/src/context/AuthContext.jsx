import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
  };

  const bootstrap = async (name, email, password) => {
    const { data } = await api.post('/auth/bootstrap', { name, email, password });
    setUser(data.user);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, bootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
