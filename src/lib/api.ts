/**
 * The one HTTP client — a port of kool-buy-marketplace/lib/api.ts.
 *
 * - Attaches the stored access token.
 * - On 401 `token_not_valid` it performs ONE shared refresh and retries, so
 *   concurrent requests never race each other's refresh token.
 * - Turns API error payloads into friendly text (same code → message table).
 */
import { API_BASE_URL } from './config';
import { accessToken, clearStoredTokens, readStoredTokens, writeStoredTokens } from './token-storage';

export interface ApiError extends Error {
  status: number;
  code?: string | null;
  response?: unknown;
  isNetworkError?: boolean;
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching the stored token (public endpoints). */
  anonymous?: boolean;
  /** Override the bearer token (registration steps hand one back). */
  token?: string;
  timeoutMs?: number;
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  not_a_buyer:
    "This account can't buy on the marketplace. Sign in with an individual, retailer or wholesaler account to shop.",
  seller_not_available: 'This store is not available for your account type.',
  seller_cannot_add_own_product: "You can't buy from your own store.",
  no_store: "You don't have a store set up yet.",
  retailer_not_approved:
    'Ordering unlocks once your business account is approved. Complete your onboarding so our team can verify your business.',
  permission_denied: "You don't have access to this page.",
  outstanding_invoice:
    'You have unpaid invoices. Please settle your outstanding invoices before placing a new order.',
  store_unavailable: 'This store is not taking orders right now.',
  product_unavailable: 'This product is no longer available.',
  insufficient_stock: 'There is not enough stock for the quantity you asked for.',
  account_not_approved:
    'Your business account must be approved before you can do this. Complete your onboarding so our team can verify your business.',
  order_on_hold: 'This order is on hold while an item issue is being resolved.',
  cart_market_mismatch:
    'Your cart already has items from another market. Check out or clear those items before adding this one.',
  delivery_address_required: 'Choose a delivery address before placing your order.',
  price_changed:
    'Some prices changed since you added these items. Your cart has been updated — review the new total and place your order again.',
  dedicated_accounts_disabled: 'Bank transfer accounts are not available right now.',
  refund_exceeds_paid: 'The refund is more than what is left to refund on this payment.',
  payment_not_paid: 'This payment has not been completed, so it can’t be refunded.',
  order_already_paid: 'This order is already paid.',
  invalid_resolution: 'Choose how to resolve this payment.',
  financing_over_limit:
    'This order is more than your available credit. Pay now with Paystack, or reduce your order and try again.',
  financing_not_eligible: 'Inventory financing isn’t available for this order. Pay now with Paystack instead.',
  koolboks_delivery: 'Koolboks logistics delivers this order.',
  order_expired:
    'This order was not paid within 30 minutes, so the reservation expired and the items were released. Add them to your cart again to reorder.',
  invalid_credentials: 'Wrong email, phone number or password.',
  authentication_required: 'Please sign in to continue.',
};

const cleanErrorText = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.includes('ErrorDetail')) return trimmed;
  const match = trimmed.match(/ErrorDetail\(string=['"](.+?)['"]\s*,/);
  return match?.[1]?.trim() || trimmed;
};

export function extractApiErrorMessage(data: unknown, status?: number): string {
  const fallback = status ? `Something went wrong (${status}).` : 'Something went wrong.';
  if (!data || typeof data !== 'object') return fallback;
  const payload = data as Record<string, unknown>;
  const nested = payload.error;

  if (typeof nested === 'string' && nested.trim()) {
    if (typeof payload.message === 'string' && payload.message.trim()) return cleanErrorText(payload.message);
    return ERROR_CODE_MESSAGES[nested] ?? cleanErrorText(nested.replace(/_/g, ' '));
  }
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    if (typeof n.message === 'string' && n.message.trim()) return cleanErrorText(n.message);
    const details = n.details as Record<string, unknown> | undefined;
    if (details && typeof details.detail === 'string') return cleanErrorText(details.detail);
    if (typeof n.code === 'string') return ERROR_CODE_MESSAGES[n.code] ?? n.code;
  }
  if (typeof payload.detail === 'string' && payload.detail.trim()) return cleanErrorText(payload.detail);
  if (typeof payload.message === 'string' && payload.message.trim()) return cleanErrorText(payload.message);
  if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length) return String(payload.non_field_errors[0]);
  // Field errors: { email: ["This field is required."] }
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'success') continue;
    const msg = Array.isArray(v) ? v[0] : v;
    if (typeof msg === 'string' && msg) return `${k.replace(/_/g, ' ')}: ${msg}`;
  }
  return fallback;
}

/** The error code from a failed call (`{ error: 'code' }`), if any. */
export function apiErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as ApiError;
  if (e.code) return e.code;
  return null;
}

/** Human text for any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const tokens = readStoredTokens();
    const refresh = tokens?.refresh;
    if (!refresh || refresh === 'undefined' || refresh === 'null') return null;
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as { access?: string; refresh?: string };
      if (!data?.access) return null;
      writeStoredTokens({ ...tokens, access: data.access, refresh: data.refresh ?? refresh });
      return data.access;
    } catch {
      return null;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function codeOf(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.error === 'string') return d.error;
  if (d.error && typeof d.error === 'object' && typeof (d.error as Record<string, unknown>).code === 'string') {
    return (d.error as Record<string, unknown>).code as string;
  }
  if (typeof d.code === 'string') return d.code;
  return null;
}

function isTokenInvalid(data: unknown): boolean {
  const text = JSON.stringify(data ?? '').toLowerCase();
  return codeOf(data) === 'token_not_valid' || text.includes('token not valid') || text.includes('token_not_valid');
}

export async function api<T = unknown>(endpoint: string, options: ApiOptions = {}, isRetry = false): Promise<T> {
  const { body, anonymous, token, timeoutMs = 20000, headers: extraHeaders, ...rest } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  Object.assign(headers, (extraHeaders as Record<string, string>) ?? {});
  const bearer = token ?? (anonymous ? null : accessToken());
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: rest.signal ?? controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const e = new Error(
      aborted
        ? 'The request timed out. Please check your connection and try again.'
        : "Couldn't reach the server. Check your internet connection and try again.",
    ) as ApiError;
    e.status = 0;
    e.isNetworkError = true;
    if (__DEV__) console.warn(`[api] network failure ${rest.method ?? 'GET'} ${url}`, err);
    throw e;
  } finally {
    clearTimeout(timer);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let data: unknown = null;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      const e = new Error(`The server returned an unexpected response (${response.status}).`) as ApiError;
      e.status = response.status;
      e.response = text;
      throw e;
    }
    return (text as unknown) as T;
  }

  if (!response.ok) {
    if (response.status === 401 && isTokenInvalid(data)) {
      if (bearer && !token && !isRetry) {
        const fresh = await refreshAccessToken();
        if (fresh) return api<T>(endpoint, options, true);
      }
      if (!token) clearStoredTokens();
    }
    const e = new Error(extractApiErrorMessage(data, response.status)) as ApiError;
    e.status = response.status;
    e.code = codeOf(data);
    e.response = data;
    throw e;
  }

  return data as T;
}

/** Build `?a=1&b=2`, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}
