// src/services/redService.ts
// Capa de servicios para la red multinivel consumiendo la API Go/Fiber
import { apiFetch } from './http';
import type { Referido } from '../data/red';

export const getRed = async (email?: string): Promise<Referido[]> => {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return apiFetch<Referido[]>(`/api/red${query}`);
};
