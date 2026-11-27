/**
 * The server cart, shared by the tab badge, product pages and the cart screen.
 * Every change refetches the cart (the web fires 'cartUpdated' for the same).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addToCart, cartCount, getCart, removeFromCart, setCartQuantity } from '@/services/buyer';
import type { CartResponse } from '@/services/types';

import { useSession } from './session';

interface CartValue {
  cart: CartResponse | null;
  count: number;
  loading: boolean;
  reload: () => Promise<void>;
  add: (productId: string, quantity?: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  const signedIn = status === 'signedIn';
  const owner = signedIn ? (user?.id ?? 'me') : null;
  const [state, setState] = useState<{ owner: string | null; cart: CartResponse | null }>({ owner: null, cart: null });

  useEffect(() => {
    if (!owner) return;
    let alive = true;
    getCart()
      .then((c) => alive && setState({ owner, cart: c }))
      .catch(() => alive && setState((s) => ({ owner, cart: s.cart })));
    return () => {
      alive = false;
    };
  }, [owner]);

  const reload = useCallback(async () => {
    if (!owner) return;
    try {
      const c = await getCart();
      setState({ owner, cart: c });
    } catch {
      /* the badge is supplementary */
    }
  }, [owner]);

  const cart = owner && state.owner === owner ? state.cart : null;
  const loading = Boolean(owner) && state.owner !== owner;

  const add = useCallback(
    async (productId: string, quantity = 1) => {
      await addToCart(productId, quantity);
      await reload();
    },
    [reload],
  );
  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      await setCartQuantity(productId, quantity);
      await reload();
    },
    [reload],
  );
  const remove = useCallback(
    async (productId: string) => {
      await removeFromCart(productId);
      await reload();
    },
    [reload],
  );

  const value = useMemo(() => ({ cart, count: cartCount(cart), loading, reload, add, setQuantity, remove }), [cart, loading, reload, add, setQuantity, remove]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
