// src/services/productosService.ts
// Capa de servicios del catálogo conectada al backend Go/Fiber
import { apiFetch } from './http';
import { productosMock, type Producto } from '../data/productos';

// Obtiene la lista completa de productos desde el backend con fallback local
export const getProductos = async (): Promise<Producto[]> => {
  try {
    const data = await apiFetch<Producto[]>('/api/productos');
    return data && data.length > 0 ? data : productosMock;
  } catch (err) {
    console.warn('API no disponible para catálogo, usando datos locales:', err);
    return productosMock;
  }
};

// Obtiene el detalle de un producto específico por ID desde el backend
export const getProductoById = async (id: number): Promise<Producto | undefined> => {
  try {
    return await apiFetch<Producto>(`/api/productos/${id}`);
  } catch (err) {
    console.warn(`API no disponible para producto ${id}, usando datos locales:`, err);
    return productosMock.find((p) => p.id === id);
  }
};
