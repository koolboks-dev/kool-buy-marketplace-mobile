/**
 * The signed-in account, from /users/whoami/ — the same source of truth as the
 * web's AuthProvider. Exposes role, staff permissions and sign in / out.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { hasStaffPermission, isBuyerRole, isSellerRole } from '@/lib/nav';
import { clearStoredTokens, hasAccessToken, onTokensChange, readStoredTokens, writeStoredTokens } from '@/lib/token-storage';
import { getWhoAmI } from '@/services/auth';
import type { LoginResponse, WhoAmI } from '@/services/types';

type Status = 'booting' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: Status;
  user: WhoAmI | null;
  isStaff: boolean;
  isSeller: boolean;
  isBuyer: boolean;
  isWholesaler: boolean;
  permissions: string[] | null;
  can: (permission?: string | string[]) => boolean;
  signIn: (tokens: Pick<LoginResponse, 'access' | 'refresh' | 'user_id'>) => Promise<WhoAmI | null>;
  signOut: () => void;
  refresh: () => Promise<WhoAmI | null>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WhoAmI | null>(null);
  // Tokens are read before the first render (root layout), so the start state is known.
  const [status, setStatus] = useState<Status>(() => (hasAccessToken() ? 'booting' : 'signedOut'));

  const refresh = useCallback(async () => {
    if (!hasAccessToken()) {
      setUser(null);
      setStatus('signedOut');
      return null;
    }
    try {
      const me = await getWhoAmI();
      if (!me) {
        clearStoredTokens();
        setUser(null);
        setStatus('signedOut');
        return null;
      }
      setUser(me);
      setStatus('signedIn');
      return me;
    } catch {
      // Offline or server down: keep the session, show what we have.
      setStatus(hasAccessToken() ? 'signedIn' : 'signedOut');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hasAccessToken()) return;
    let alive = true;
    getWhoAmI()
      .then((me) => {
        if (!alive) return;
        if (!me) {
          clearStoredTokens();
          setUser(null);
          setStatus('signedOut');
          return;
        }
        setUser(me);
        setStatus('signedIn');
      })
      .catch(() => alive && setStatus('signedIn'));
    return () => {
      alive = false;
    };
  }, []);

  // A refresh token rejected mid-use clears storage; follow it.
  useEffect(
    () =>
      onTokensChange((t) => {
        if (!t?.access) {
          setUser(null);
          setStatus('signedOut');
        }
      }),
    [],
  );

  const signIn = useCallback<SessionValue['signIn']>(
    async (tokens) => {
      writeStoredTokens({ ...readStoredTokens(), access: tokens.access, refresh: tokens.refresh, user_id: tokens.user_id });
      return refresh();
    },
    [refresh],
  );

  const signOut = useCallback(() => {
    clearStoredTokens();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<SessionValue>(() => {
    const permissions = user?.is_staff ? (user.staff?.permissions ?? null) : [];
    return {
      status,
      user,
      isStaff: Boolean(user?.is_staff),
      isSeller: isSellerRole(user?.role),
      isBuyer: isBuyerRole(user?.role),
      isWholesaler: user?.role === 'wholesaler',
      permissions,
      can: (p) => Boolean(user?.is_staff) && hasStaffPermission(permissions, p),
      signIn,
      signOut,
      refresh,
    };
  }, [status, user, signIn, signOut, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
