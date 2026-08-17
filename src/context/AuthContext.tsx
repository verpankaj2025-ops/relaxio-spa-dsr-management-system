import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
    } catch (err) {
      console.error('Failed to restore user session:', err);
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const res = await api.login(credentials);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        refreshUser,
        isSuperAdmin,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
