'use client';

// Contexto de autenticación para manejar estado global del usuario
// Provee autenticación, login, logout y verificación de permisos

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, LoginCredentials, RegisterData, AuthResponse } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Verificar si hay un token válido
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        } else {
          // Intentar refrescar el token
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Error al inicializar autenticación:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setLoading(true);
    
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
      }
      
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<AuthResponse> => {
    setLoading(true);
    
    try {
      const response = await authService.register(userData);
      
      if (response.success && response.user) {
        setUser(response.user);
      }
      
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = authService.isAuthenticated();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}

// Hook para proteger rutas que requieren autenticación
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);
  
  return { isAuthenticated, loading };
}

// Hook para proteger rutas que requieren un rol específico
export function useRequireRole(requiredRole: string, redirectTo: string = '/dashboard') {
  const { user, hasRole, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && user && !hasRole(requiredRole) && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [user, hasRole, requiredRole, loading, redirectTo]);
  
  return { hasRequiredRole: hasRole(requiredRole), loading };
}
