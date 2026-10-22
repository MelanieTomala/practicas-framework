// src/services/http.ts
// Cliente HTTP desacoplado con inyección de JWT e interceptación tipada de errores

export interface SessionData {
  usuario: {
    email: string;
    rol: 'admin' | 'cliente';
  };
  token: string;
}

export const SESSION_STORAGE_KEY = 'multicatalogo_sesion';

export const getStoredSession = (): SessionData | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch {
    return null;
  }
};

export const saveStoredSession = (session: SessionData): void => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Inyección automática del token JWT
  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  // Header auxiliar de trazabilidad
  if (session?.usuario?.email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', session.usuario.email);
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
