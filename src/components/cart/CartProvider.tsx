// src/components/cart/CartProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  setQuantity: (productId: number, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'musthave-cart';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.productId
            ? { ...p, quantity: p.quantity + item.quantity }
            : p,
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const setQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, quantity } : p,
      ),
    );
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        totalAmount,
        addItem,
        removeItem,
        clearCart,
        setQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};







