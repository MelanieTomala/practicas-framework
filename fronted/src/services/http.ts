// src/services/http.ts
// Cliente HTTP desacoplado con inyección de JWT, soporte offline y persistencia

export interface SessionData {
  usuario: {
    email: string;
    rol: 'admin' | 'cliente';
  };
  token: string;
}

export interface OfflineUserVault {
  email: string;
  rol: 'admin' | 'cliente';
  token: string;
  savedAt: number;
}

export const SESSION_STORAGE_KEY = 'multicatalogo_sesion';
export const OFFLINE_VAULT_KEY = 'multicatalogo_offline_vault';

export const getStoredSession = (): SessionData | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch {
    return null;
  }
};

export const saveStoredSession = (session: SessionData): void => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Manejo de excepciones de almacenamiento
  }
};

export const clearStoredSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Manejo de excepciones
  }
};

export const saveOfflineUser = (email: string, rol: 'admin' | 'cliente', token: string): void => {
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_KEY);
    const vault: Record<string, OfflineUserVault> = raw ? JSON.parse(raw) : {};
    vault[email.toLowerCase()] = {
      email: email.toLowerCase(),
      rol,
      token,
      savedAt: Date.now(),
    };
    localStorage.setItem(OFFLINE_VAULT_KEY, JSON.stringify(vault));
  } catch {
    // Manejo silencioso ante restricciones de cuota
  }
};

export const authenticateOffline = (
  email: string,
  password: string
): { email: string; rol: 'admin' | 'cliente'; token: string } => {
  const normEmail = email.trim().toLowerCase();

  // 1. Cuentas de prueba preconfiguradas para pruebas offline
  if (normEmail === 'admin@upse.edu.ec' && password === '123456') {
    const offlineToken = `offline-jwt-admin-${Date.now()}`;
    saveOfflineUser(normEmail, 'admin', offlineToken);
    saveStoredSession({ usuario: { email: normEmail, rol: 'admin' }, token: offlineToken });
    return { email: normEmail, rol: 'admin', token: offlineToken };
  }

  if (normEmail === 'cliente@upse.edu.ec' && password === '123456') {
    const offlineToken = `offline-jwt-cliente-${Date.now()}`;
    saveOfflineUser(normEmail, 'cliente', offlineToken);
    saveStoredSession({ usuario: { email: normEmail, rol: 'cliente' }, token: offlineToken });
    return { email: normEmail, rol: 'cliente', token: offlineToken };
  }

  // 2. Usuarios previamente sincronizados en este dispositivo
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_KEY);
    if (raw) {
      const vault: Record<string, OfflineUserVault> = JSON.parse(raw);
      const cached = vault[normEmail];
      if (cached) {
        saveStoredSession({ usuario: { email: cached.email, rol: cached.rol }, token: cached.token });
        return { email: cached.email, rol: cached.rol, token: cached.token };
      }
    }
  } catch {
    // Error al leer localStorage
  }

  throw new Error('Sin conexión: usuario no sincronizado en este dispositivo o credenciales inválidas.');
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Detecta si un error proviene de falta de conexión a internet o falla de red (Firefox NetworkError, etc.)
 */
export const isNetworkError = (err: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (err instanceof ApiError && err.status === 0) {
    return true;
  }
  if (err instanceof TypeError || err instanceof Error) {
    const msg = (err.message || '').toLowerCase();
    return (
      msg.includes('networkerror') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('network request failed') ||
      msg.includes('sin conexión') ||
      msg.includes('offline') ||
      msg.includes('connection refused')
    );
  }
  return false;
};

// Normalización de BASE_URL para evitar URLs relativas al protocolo ("//api/...")
const rawBase = import.meta.env.VITE_API_URL ?? '';
const BASE_URL = (rawBase === '/' || rawBase === './') ? '' : rawBase;

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  if (session?.usuario?.email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', session.usuario.email);
  }

  let url: string;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else {
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = `${cleanBase}${cleanEndpoint}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      throw new ApiError(
        0,
        'Sin conexión a internet. Los datos sincronizados se actualizarán al volver a estar online.',
        err
      );
    }
    throw err;
  }

  if (!response.ok) {
    let message = response.statusText;
    let details: unknown = undefined;
    try {
      const errorJson = (await response.json()) as { message?: string; details?: unknown };
      if (errorJson?.message) message = errorJson.message;
      if (errorJson?.details) details = errorJson.details;
    } catch {
      // Usar statusText por defecto
    }
    throw new ApiError(
      response.status,
      message || `Error HTTP ${response.status}`,
      details
    );
  }

  return response.json() as Promise<T>;
}
