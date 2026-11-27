/** Public catalogue + homepage content — the same endpoints the web landing page reads. */
import { api, qs } from '@/lib/api';
import { hasAccessToken } from '@/lib/token-storage';

import type { Option, PaginationMeta, ProductDetail, ProductReview, ProductSearchResult, Vendor, VendorProduct } from './types';

export async function listVendors(params: {
  sort?: string;
  page?: number;
  page_size?: number;
  query?: string;
  market?: string;
  business_type?: string;
  location?: string;
  state?: string;
} = {}): Promise<Vendor[]> {
  const { query, ...rest } = params;
  const res = await api<{ items: Vendor[] }>(
    `/stores/vendors/${qs({ ...rest, name: query, query })}`,
    { anonymous: !hasAccessToken() },
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export async function getVendorDetails(vendorId: string, params: { sort?: string; page?: number; page_size?: number } = {}) {
  const res = await api<{ vendor: Vendor; products: VendorProduct[]; business_hours?: Vendor['business_hours']; pagination?: PaginationMeta }>(
    `/stores/vendors/${vendorId}/${qs({ sort: params.sort, page: params.page ?? 1, page_size: params.page_size ?? 50 })}`,
    { anonymous: !hasAccessToken() },
  );
  return {
    vendor: { ...res.vendor, business_hours: res.business_hours || res.vendor?.business_hours },
    products: Array.isArray(res.products) ? res.products : [],
    pagination: res.pagination,
  };
}

export const addVendorToFavorites = (vendorId: string) => api(`/stores/vendors/${vendorId}/favorite/`, { method: 'POST' });
export const removeVendorFromFavorites = (vendorId: string) => api(`/stores/vendors/${vendorId}/favorite/`, { method: 'DELETE' });

export type ProductSort = 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular';

export const searchProducts = (params: {
  query?: string;
  categories?: string;
  min_price?: number;
  max_price?: number;
  temperature_type?: string;
  location?: string;
  state?: string;
  market?: string;
  sort?: ProductSort;
  in_stock?: boolean;
  page?: number;
  page_size?: number;
}) =>
  api<{ success: boolean; items: ProductSearchResult[]; pagination: PaginationMeta }>(
    `/products/search/${qs({ ...params, name: params.query, in_stock: params.in_stock ? 'true' : undefined })}`,
    { anonymous: true },
  );

export async function getProductDetails(productId: string): Promise<ProductDetail | null> {
  try {
    const res = await api<{ success: boolean; product?: Record<string, any> }>(`/products/detail/${productId}/`, {
      anonymous: !hasAccessToken(),
    });
    const p = res?.product;
    if (!p) return null;
    return {
      id: p.id || '',
      name: p.name || 'Product',
      images: Array.isArray(p.images) ? p.images.filter((i: unknown) => typeof i === 'string' && i).slice(0, 5) : [],
      price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
      rating: typeof p.rating === 'number' ? p.rating : 0,
      review_count: typeof p.review_count === 'number' ? p.review_count : 0,
      vendor_image_url: p.vendor_image_url || '',
      description: p.description || '',
      category: p.category && typeof p.category === 'object' ? p.category : { value: '', label: '' },
      tags: Array.isArray(p.tags) ? p.tags : [],
      in_stock: typeof p.in_stock === 'boolean' ? p.in_stock : false,
      stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
      attributes: p.attributes && typeof p.attributes === 'object' && !Array.isArray(p.attributes) ? p.attributes : undefined,
      product_type: p.product_type && typeof p.product_type === 'object' ? p.product_type : { value: '', label: '' },
      market: typeof p.market === 'string' ? p.market : undefined,
      vendor: p.vendor && p.vendor.id ? { id: String(p.vendor.id), name: String(p.vendor.name ?? '') } : null,
    };
  } catch {
    return null;
  }
}

export const getProductReviews = (productId: string, page = 1, page_size = 10) =>
  api<{ success: boolean; items: ProductReview[]; pagination: PaginationMeta }>(
    `/products/${productId}/reviews/${qs({ page, page_size })}`,
    { anonymous: true },
  );

export const listProductCategories = () => api<{ success: boolean; items: Option[] }>('/products/categories/', { anonymous: true });
export const listTemperatureTypes = () => api<{ success: boolean; items: Option[] }>('/products/temperature-types/', { anonymous: true });
export const listProductStates = () =>
  api<{ success: boolean; items: { value: string; label: string; product_count: number }[] }>('/products/states/', { anonymous: true });

// ── Homepage content (managed in Admin → Catalogue) ───────────────────────────

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  link_url: string;
  image_url: string;
  sort_order: number;
  duration: number;
  animation: string;
  is_active: boolean;
  text_style?: { badge?: string; show_badge?: boolean; show_title?: boolean; show_subtitle?: boolean; title_color?: string; subtitle_color?: string; shade?: 'dark' | 'light' | 'none' };
}

export interface HomepageStat {
  id: string;
  target: number;
  prefix: string;
  suffix: string;
  decimals: number;
  label: string;
  subtext: string;
  icon: string;
  icon_bg: string;
  sort_order: number;
  is_active: boolean;
}

export interface HomepageOffer {
  id: string;
  title: string;
  /** Who it's for, e.g. "Need a freezer, pay for stock on delivery". */
  tagline: string;
  points: string[];
  image_url: string;
  button_label: string;
  link_url: string;
  is_highlighted: boolean;
  sort_order: number;
  is_active?: boolean;
}

export interface PopularCategoryCard {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  icon: string;
  accent: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export const DEFAULT_HERO_COPY = {
  badge: 'Freezer from ₦71,390 weekly',
  title: 'KoolBuy Marketplace',
  subtitle: 'Buy stock. Own your solar freezer.',
};

export const listHeroBanners = () => api<{ success: boolean; items: HeroBanner[] }>('/hero-banners/', { anonymous: true });
export const listHomepageStats = () => api<{ success: boolean; items: HomepageStat[] }>('/homepage-stats/', { anonymous: true });
export const getHomepageOffers = () =>
  api<{ success?: boolean; heading?: string; footnote?: string; items?: HomepageOffer[]; offers?: HomepageOffer[] }>('/homepage-offers/', { anonymous: true });
export const listPopularCategories = () => api<{ success: boolean; items: PopularCategoryCard[] }>('/popular-categories/', { anonymous: true });
