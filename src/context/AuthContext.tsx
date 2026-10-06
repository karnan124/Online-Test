import React, { createContext, useContext, useState, useEffect } from 'react';
import { Creator } from '../types/index';
import { api, getStoredCreator, getStoredToken } from '../services/api';

interface AuthContextType {
  creator: Creator | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; organization?: string }) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  quickDemoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [creator, setCreator] = useState<Creator | null>(getStoredCreator());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.auth.getMe();
          setCreator(res.creator);
        } catch {
          api.auth.logout();
          setCreator(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login(email, pass);
    setCreator(res.creator);
  };

  const register = async (payload: { name: string; email: string; password: string; organization?: string }) => {
    const res = await api.auth.register(payload);
    setCreator(res.creator);
  };

  const logout = () => {
    api.auth.logout();
    setCreator(null);
  };

  const deleteAccount = async () => {
    await api.auth.deleteAccount();
    setCreator(null);
  };

  const quickDemoLogin = async () => {
    setLoading(true);
    try {
      await login('creator@testcloud.io', 'Password@123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ creator, loading, login, register, logout, deleteAccount, quickDemoLogin }}>
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
