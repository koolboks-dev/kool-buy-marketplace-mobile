/**
 * Where the app talks to the backend: the same Kool backend the KoolBuy web
 * marketplace uses (NEXT_PUBLIC_API_BASE_URL there), so one account works in both.
 *
 * Set EXPO_PUBLIC_API_BASE_URL in .env. `/api/v1` is added when missing.
 *
 * On a physical phone `127.0.0.1` is the phone itself, so in dev builds a
 * loopback URL is swapped for the LAN IP Metro serves from (Expo's hostUri).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCAL_DEFAULT = 'http://127.0.0.1:8000';
const LOOPBACK = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i;

function devHost(): string | null {
  if (!__DEV__ || Platform.OS === 'web') return null;
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];
  return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
}

export function normalizeApiBase(baseUrl?: string): string {
  let raw = (baseUrl || '').trim().replace(/\/+$/, '') || LOCAL_DEFAULT;
  const lan = devHost();
  if (lan && LOOPBACK.test(raw)) {
    raw = raw.replace(LOOPBACK, (_m, scheme: string, _h: string, port?: string) => `${scheme}${lan}${port ?? ''}`);
  }
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

export const API_BASE_URL = normalizeApiBase(process.env.EXPO_PUBLIC_API_BASE_URL);

/** The public web marketplace, for "open on web" links and share links. */
export const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL || 'https://koolbuystoremarketplace.com').replace(/\/+$/, '');

/** Notifications list scope, same as the web (`app=marketplace`). */
export const NOTIFICATION_APP = 'marketplace';
