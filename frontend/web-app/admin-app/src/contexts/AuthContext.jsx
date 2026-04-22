import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      authAPI.me().then(r => {
        const u = r.data.user || r.data.data || r.data;
        if (u.role === 'ADMIN') setUser(u);
        else { localStorage.removeItem('admin_token'); }
      }).catch(() => localStorage.removeItem('admin_token'))
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.login(email, password);
    const resp = r.data; // { success, message, data: {userId,email,role}, accessToken, refreshToken }

    // Token is at top-level of response, NOT inside data
    const token = resp.accessToken || resp.token || resp.data?.accessToken || resp.data?.token;
    const userInfo = resp.data || resp.user || resp;

    if (userInfo.role !== 'ADMIN') throw new Error('Không có quyền admin');
    if (!token) throw new Error('Không nhận được token');

    localStorage.setItem('admin_token', token);
    setUser(userInfo);
    return resp;
  };

  const logout = () => { localStorage.removeItem('admin_token'); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
