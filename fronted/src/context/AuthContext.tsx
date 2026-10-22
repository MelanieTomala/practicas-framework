// src/context/AuthContext.tsx
// Proveedor de autenticación con persistencia en localStorage ('multicatalogo_sesion')
import { useState, type ReactNode } from 'react';
import { AuthContext, type Usuario } from './auth';
import { getStoredSession, saveStoredSession, clearStoredSession } from '../services/http';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Inicializamos leyendo la sesión persistida
  const [session, setSession] = useState<{ user: Usuario | null; token: string | null }>(() => {
    const saved = getStoredSession();
    if (saved?.usuario && saved?.token) {
      return { user: saved.usuario, token: saved.token };
    }
    return { user: null, token: null };
  });

  const login = (usuario: Usuario, token: string) => {
    saveStoredSession({ usuario, token });
    setSession({ user: usuario, token });
  };

  const logout = () => {
    clearStoredSession();
    setSession({ user: null, token: null });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session.user && !!session.token,
        user: session.user,
        token: session.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
