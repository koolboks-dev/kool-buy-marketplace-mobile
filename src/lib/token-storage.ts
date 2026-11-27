/**
 * Access/refresh token storage. Same shape as the web's `auth_tokens`
 * ({ access, refresh, user_id, needs_profile }).
 *
 * Tokens live in memory for synchronous reads and are persisted to
 * AsyncStorage. Call `loadStoredTokens()` once at start-up.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_tokens';

export interface StoredTokens {
  access?: string;
  refresh?: string;
  user_id?: string;
  needs_profile?: boolean;
}

let cache: StoredTokens | null = null;
let loaded = false;
const listeners = new Set<(tokens: StoredTokens | null) => void>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(cache);
    } catch {
      /* a listener must never break storage */
    }
  });
}

export async function loadStoredTokens(): Promise<StoredTokens | null> {
  if (loaded) return cache;
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    cache = raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    cache = null;
  }
  loaded = true;
  return cache;
}

export function readStoredTokens(): StoredTokens | null {
  return cache;
}

export function writeStoredTokens(tokens: StoredTokens): void {
  cache = tokens;
  loaded = true;
  AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)).catch(() => {});
  emit();
}

export function clearStoredTokens(): void {
  const had = cache !== null;
  cache = null;
  loaded = true;
  AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  if (had) emit();
}

const isUsable = (t?: string | null) => Boolean(t && t !== 'undefined' && t !== 'null' && t !== '[object Object]');

export function accessToken(): string | null {
  return isUsable(cache?.access) ? (cache!.access as string) : null;
}

export function hasAccessToken(): boolean {
  return accessToken() !== null;
}

export function onTokensChange(fn: (tokens: StoredTokens | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True when a JWT's `exp` is in the past. Non-JWT strings count as valid. */
export function isJwtExpired(token?: string | null): boolean {
  if (!isUsable(token)) return true;
  const parts = (token as string).split('.');
  if (parts.length !== 3) return false;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')) : '';
    if (!json) return false;
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 <= Date.now() : false;
  } catch {
    return false;
  }
}
