// src/context/auth.ts
// Tipos y hook desacoplados de AuthContext para evitar warnings de react-refresh
import { createContext, useContext } from 'react';

export type Rol = 'admin' | 'cliente';

export interface Usuario {
  email: string;
  rol: Rol;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: Usuario | null;
  token: string | null;
  login: (usuario: Usuario, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
