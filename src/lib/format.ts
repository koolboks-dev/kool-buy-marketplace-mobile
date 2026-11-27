/** Money and date formatting — mirrors kool-buy-marketplace/lib/markets.ts. */

export type MarketCode = 'NG' | 'KE' | 'UG';

const MARKETS: Record<MarketCode, { currency: string; symbol: string; locale: string; dial: string; name: string }> = {
  NG: { currency: 'NGN', symbol: '₦', locale: 'en-NG', dial: '+234', name: 'Nigeria' },
  KE: { currency: 'KES', symbol: 'KSh', locale: 'en-KE', dial: '+254', name: 'Kenya' },
  UG: { currency: 'UGX', symbol: 'USh', locale: 'en-UG', dial: '+256', name: 'Uganda' },
};

export const DEFAULT_MARKET: MarketCode = 'NG';

function marketFor(code?: string | null) {
  const key = (code || DEFAULT_MARKET).toUpperCase();
  return (
    MARKETS[key as MarketCode] ??
    Object.values(MARKETS).find((m) => m.currency === key) ??
    MARKETS[DEFAULT_MARKET]
  );
}

export function parseMoney(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw == null) return 0;
  return parseFloat(String(raw).replace(/[^\d.-]/g, '')) || 0;
}

function group(n: number, decimals: number): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${withCommas}${dec ? `.${dec}` : ''}`;
}

/** "₦12,500.00" — market code (NG) or currency code (NGN). */
export function formatMoney(amount: string | number | null | undefined, marketOrCurrency?: string | null): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const m = marketFor(marketOrCurrency);
  return `${m.symbol}${group(parseMoney(amount), 2)}`;
}

/** "₦80,000" — whole amounts, for KPI tiles. */
export function formatWholeMoney(amount: string | number | null | undefined, marketOrCurrency?: string | null): string {
  const m = marketFor(marketOrCurrency);
  return `${m.symbol}${group(parseMoney(amount), 0)}`;
}

/** "₦1.2M" for compact tiles. */
export function formatCompactMoney(amount: string | number | null | undefined, marketOrCurrency?: string | null): string {
  const m = marketFor(marketOrCurrency);
  const n = parseMoney(amount);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${m.symbol}${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${m.symbol}${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${m.symbol}${(n / 1e3).toFixed(1)}K`;
  return `${m.symbol}${group(n, 0)}`;
}

export function formatNumber(n: number | string | null | undefined): string {
  return group(parseMoney(n), 0);
}

export const dialCode = (market?: string | null) => marketFor(market).dial;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(v?: string | number | Date | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Nov 2026" */
export function formatDate(v?: string | number | Date | null): string {
  const d = toDate(v);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Nov 2026, 14:05" */
export function formatDateTime(v?: string | number | Date | null): string {
  const d = toDate(v);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)}, ${hh}:${mm}`;
}

/** "3h ago", "2d ago" */
export function timeAgo(v?: string | number | Date | null): string {
  const d = toDate(v);
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
}

export const titleCase = (s?: string | null) =>
  String(s ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name?: string | null) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'K';
