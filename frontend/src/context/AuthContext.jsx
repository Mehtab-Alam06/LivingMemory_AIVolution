import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const API = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api` 
  : 'https://livingmemory-aivolution.onrender.com/api';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('lm_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('lm_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const sendOtp = (email) => axios.post(`${API}/auth/send-otp`, { email });

  const register = async (email, otp, name) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, otp, name });
    localStorage.setItem('lm_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await axios.post(`${API}/auth/verify-otp`, { email, otp });
    localStorage.setItem('lm_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const updateProfile = async (name) => {
    const { data } = await axios.patch(`${API}/auth/profile`, { name }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('lm_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, sendOtp, register, verifyOtp, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);