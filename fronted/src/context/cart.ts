// src/context/cart.ts
// Tipos y hook desacoplados de CartContext para Fast Refresh de Vite
import { createContext, useContext } from 'react';
import type { Producto } from '../data/productos';

export interface CartItem extends Producto {
  cantidad: number;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto) => void;
  removeFromCart: (id: number) => void;
  incrementQuantity: (id: number) => void;
  decrementQuantity: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};
