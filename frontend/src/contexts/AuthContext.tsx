'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiClient, authApi } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on mount
    const initializeAuth = async () => {
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('auth_token')
            : null;

        if (!token) {
          setLoading(false);
          return;
        }

        // Set token in API client BEFORE making the request
        apiClient.setToken(token);

        // Verify token is still valid by fetching user info
        const response = await authApi.getMe();

        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token is invalid or expired, clear it
          apiClient.setToken(null);
          setUser(null);
        }
      } catch (error) {
        // Network error or invalid token
        console.error('Auth initialization error:', error);
        apiClient.setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
