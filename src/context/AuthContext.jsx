import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [resident, setResident] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('stayos_token'));
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [activeProperty, setActiveProperty] = useState(null);
  const [toast, setToast] = useState(null);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadCurrentUser = async () => {
    const savedToken = localStorage.getItem('stayos_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setOrganization(data.organization);
      setResident(data.resident);

      if (data.user.organization_id) {
        localStorage.setItem('stayos_org_id', data.user.organization_id);
      }

      // Load properties for this tenant
      if (data.user.role !== 'super_admin' && data.user.role !== 'resident') {
        const props = await api.getProperties();
        setProperties(props);
        if (props.length > 0) {
          const savedPropId = localStorage.getItem('stayos_active_property');
          const matched = props.find(p => p.id === savedPropId);
          setActiveProperty(matched || props[0]);
        }
      }
    } catch (err) {
      console.warn('Session expired, logging out:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await api.login(credentials);
      localStorage.setItem('stayos_token', data.token);
      if (data.user.organization_id) {
        localStorage.setItem('stayos_org_id', data.user.organization_id);
      }
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
      setResident(data.resident);

      if (data.user.role !== 'super_admin' && data.user.role !== 'resident') {
        const props = await api.getProperties();
        setProperties(props);
        if (props.length > 0) setActiveProperty(props[0]);
      }

      showToast(`Welcome back, ${data.user.full_name}!`, 'success');
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const data = await api.register(payload);
      localStorage.setItem('stayos_token', data.token);
      if (data.user.organization_id) {
        localStorage.setItem('stayos_org_id', data.user.organization_id);
      }
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);

      showToast(`Organization "${payload.orgName}" registered successfully!`, 'success');
      return data;
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (roleOrEmail) => {
    setLoading(true);
    try {
      const data = await api.switchDemoRole(roleOrEmail);
      localStorage.setItem('stayos_token', data.token);
      if (data.user.organization_id) {
        localStorage.setItem('stayos_org_id', data.user.organization_id);
      }
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
      setResident(data.resident);

      if (data.user.role !== 'super_admin' && data.user.role !== 'resident') {
        const props = await api.getProperties();
        setProperties(props);
        if (props.length > 0) setActiveProperty(props[0]);
      } else {
        setProperties([]);
        setActiveProperty(null);
      }

      showToast(`Switched into role: ${data.user.role.toUpperCase()} (${data.user.full_name})`, 'info');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('stayos_token');
    localStorage.removeItem('stayos_org_id');
    localStorage.removeItem('stayos_active_property');
    setToken(null);
    setUser(null);
    setOrganization(null);
    setResident(null);
    setProperties([]);
    setActiveProperty(null);
    showToast('Logged out successfully.', 'info');
  };

  const changeActiveProperty = (prop) => {
    setActiveProperty(prop);
    if (prop) {
      localStorage.setItem('stayos_active_property', prop.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        resident,
        token,
        loading,
        properties,
        activeProperty,
        setActiveProperty: changeActiveProperty,
        login,
        register,
        logout,
        switchRole,
        showToast,
        toast,
        quickActionOpen,
        setQuickActionOpen,
        refreshUser: loadCurrentUser,
        refreshProfile: loadCurrentUser
      }}
    >
      {children}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all backdrop-blur-md bg-white/95 text-slate-800 border-slate-200">
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'error' ? 'bg-rose-500 ring-4 ring-rose-100' : (toast.type === 'info' ? 'bg-primary-500 ring-4 ring-primary-100' : 'bg-emerald-500 ring-4 ring-emerald-100')}`}></div>
          <div>{toast.message}</div>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 font-bold text-base">&times;</button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
