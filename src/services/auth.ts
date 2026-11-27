/** Auth endpoints — same paths and bodies as the web's lib/auth.ts. */
import { api } from '@/lib/api';
import { accessToken } from '@/lib/token-storage';
import { API_BASE_URL } from '@/lib/config';

import type { LoginResponse, WhoAmI } from './types';

export const loginWithPassword = (identifier: string, password: string) =>
  api<LoginResponse>('/auth/login/', { method: 'POST', body: { identifier, password }, anonymous: true });

export const loginEmailOtpRequest = (email: string) =>
  api<{ success?: boolean; message?: string; code?: string }>('/auth/login/email-otp/request/', {
    method: 'POST',
    body: { email },
    anonymous: true,
  });

export const loginEmailOtpVerify = (email: string, code: string) =>
  api<LoginResponse>('/auth/login/email-otp/verify/', { method: 'POST', body: { email, code }, anonymous: true });

export async function getWhoAmI(): Promise<WhoAmI | null> {
  const token = accessToken();
  if (!token) return null;
  try {
    const data = await api<WhoAmI>('/users/whoami/', { cache: 'no-store' });
    return { ...data, success: true };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) return null;
    throw err;
  }
}

export const chooseMarketplaceRole = (role: 'individual' | 'retailer' | 'wholesaler') =>
  api<{ success: boolean; role: string; must_change_password: boolean; access_gated: boolean }>('/auth/choose-role/', {
    method: 'POST',
    body: { role },
  });

export const changePassword = (current_password: string, new_password: string) =>
  api<{ success: boolean; message?: string; must_change_password: boolean }>('/auth/change-password/', {
    method: 'POST',
    body: { current_password, new_password },
  });

export const forgotPasswordRequest = (email: string) =>
  api<{ success?: boolean; message?: string; code?: string }>('/auth/forgot-password/request/', {
    method: 'POST',
    body: { email },
    anonymous: true,
  });

export const forgotPasswordReset = (email: string, code: string, new_password: string) =>
  api<{ message?: string }>('/auth/forgot-password/reset/', {
    method: 'POST',
    body: { email, code, new_password },
    anonymous: true,
  });

// ── Buyer (individual) registration: email → verify → password+phone → verify phone
export const buyerRegisterEmail = (body: { first_name: string; last_name: string; email: string; phone_number?: string; market?: string; role?: 'individual' }) =>
  api<{ success?: boolean; message?: string; code?: string }>('/auth/buyer/register/email/', { method: 'POST', body, anonymous: true });

export const buyerVerifyEmail = (body: { email: string; code: string; first_name: string; last_name: string; phone_number?: string; market?: string; role?: 'individual' }) =>
  api<{ access?: string; refresh?: string; message?: string }>('/auth/buyer/register/verify-email/', { method: 'POST', body, anonymous: true });

export const buyerRegisterPasswordPhone = (body: { password: string; phone_number: string; market?: string }, token: string) =>
  api<{ phone_verification_required?: boolean; code?: string; message?: string }>('/auth/buyer/register/password-phone/', { method: 'POST', body, token });

export const buyerVerifyPhone = (body: { phone_number: string; code: string; market?: string }, token: string) =>
  api<{ access?: string; refresh?: string; user_id?: string }>('/auth/buyer/register/verify-phone/', { method: 'POST', body, token });

// ── Vendor (retailer / wholesaler) registration: email → verify → password → phone → verify phone
export const vendorRegisterEmail = (body: { email: string; phone_number?: string; market?: string; role?: 'retailer' | 'wholesaler' }) =>
  api<{ success?: boolean; message?: string; code?: string }>('/auth/vendor/register/email/', { method: 'POST', body, anonymous: true });

export const vendorVerifyEmail = (body: { email: string; code: string; phone_number?: string; market?: string; role?: 'retailer' | 'wholesaler' }) =>
  api<{ access?: string; refresh?: string }>('/auth/vendor/register/verify-email/', { method: 'POST', body, anonymous: true });

export const vendorSetPassword = (password: string, token: string) =>
  api<{ success?: boolean }>('/auth/vendor/register/set-password/', { method: 'POST', body: { password }, token });

export const vendorRegisterPhone = (body: { phone_number: string; market?: string }, token: string) =>
  api<{ phone_verification_required?: boolean; code?: string }>('/auth/vendor/register/phone/', { method: 'POST', body, token });

export const vendorVerifyPhone = (body: { phone_number: string; code: string; market?: string }, token: string) =>
  api<{ access?: string; refresh?: string; user_id?: string }>('/auth/vendor/register/verify-phone/', { method: 'POST', body, token });

/** Seller profile step after phone verification (business details). */
export const completeSellerProfile = (
  body: { role: 'retailer' | 'wholesaler'; business_name: string; business_type: string; store_address: string; market?: string; selling_categories?: string[]; store_logo_url?: string },
  token: string,
) => api('/auth/register/seller/', { method: 'POST', body, token });

export const listBusinessTypes = () =>
  api<{ success: boolean; items: { value: string; label: string }[] }>('/stores/business-types/', { anonymous: true });

/** Presigned upload: ask the API for a URL, PUT the file, get back its public URL. */
export async function uploadImage(localUri: string, filename: string, contentType = 'image/jpeg'): Promise<string> {
  const sas = await api<{ upload_url: string; blob_url: string }>('/storage/sas/upload/', {
    method: 'POST',
    body: { filename: filename.replace(/[^a-zA-Z0-9._-]/g, '_'), kind: 'image', content_type: contentType },
  });
  const blob = await (await fetch(localUri)).blob();
  const put = await fetch(sas.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'x-ms-blob-type': 'BlockBlob' },
    body: blob,
  });
  if (!put.ok && put.status !== 201) throw new Error(`Upload failed (${put.status}).`);
  return sas.blob_url;
}

export const API_URL = API_BASE_URL;
