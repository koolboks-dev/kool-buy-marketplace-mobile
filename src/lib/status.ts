/**
 * Status → badge tone and label. A port of getStatusBadgeConfig in the web's
 * components/ui/status-badge.tsx, so a status reads the same on both.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand' | 'verified';

export interface StatusConfig {
  label: string;
  tone: Tone;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pretty = (s: string) => cap(s.replace(/_/g, ' '));

export function statusConfig(raw: string | boolean | null | undefined, kind: 'order' | 'auto' = 'auto'): StatusConfig {
  if (typeof raw === 'boolean') return raw ? { label: 'Verified', tone: 'verified' } : { label: 'Unverified', tone: 'neutral' };
  const s = String(raw ?? '').toLowerCase().trim();
  switch (s) {
    case '':
      return { label: '—', tone: 'neutral' };
    case 'verified':
      return { label: 'Verified', tone: 'verified' };
    case 'unverified':
      return { label: 'Unverified', tone: 'neutral' };
    case 'active':
    case 'approved':
    case 'online':
    case 'resolved':
      return { label: pretty(s), tone: 'success' };
    case 'inactive':
    case 'suspended':
    case 'blocked':
    case 'banned':
    case 'offline':
      return { label: pretty(s), tone: 'danger' };
    case 'delivered':
      return { label: kind === 'order' ? 'Completed' : 'Delivered', tone: 'success' };
    case 'completed':
    case 'paid':
    case 'success':
    case 'successful':
    case 'processed':
      return { label: pretty(s), tone: 'success' };
    case 'pending_credit_review':
    case 'credit_review':
      return { label: 'Credit review', tone: 'warning' };
    case 'pending_approval':
      return { label: 'Awaiting approval', tone: 'warning' };
    case 'pending_payment':
    case 'awaiting_payment':
      return { label: 'Awaiting payment', tone: 'warning' };
    case 'partially_paid':
      return { label: 'Partially paid', tone: 'warning' };
    case 'needs_info':
      return { label: 'More info needed', tone: 'warning' };
    case 'submitted':
    case 'pending':
    case 'unpaid':
    case 'refunded':
    case 'refund_due':
    case 'arrived':
    case 'requested':
    case 'open':
      return { label: s === 'refund_due' ? 'Refund due' : pretty(s), tone: 'warning' };
    case 'under_review':
    case 'awaiting_confirmation':
    case 'in_transit':
    case 'shipped':
    case 'out_for_delivery':
    case 'picked_up':
    case 'travelling_to_pickup':
      return {
        label: s === 'in_transit' ? 'In transit' : s === 'out_for_delivery' ? 'Out for delivery' : pretty(s),
        tone: 'brand',
      };
    case 'new':
    case 'confirmed':
    case 'processing':
    case 'preparing':
    case 'packed':
    case 'assigned':
    case 'driver_assigned':
    case 'ready_for_dispatch':
    case 'draft':
    case 'not_started':
    case 'returned':
    case 'expired':
    case 'payment_expired':
    case 'not_requested':
    case 'initiated':
      return {
        label:
          s === 'driver_assigned' || s === 'assigned'
            ? 'Driver assigned'
            : s === 'payment_expired'
              ? 'Expired'
              : pretty(s),
        tone: 'neutral',
      };
    case 'cancelled':
    case 'failed':
    case 'rejected':
    case 'declined':
    case 'overdue':
    case 'disputed':
    case 'delivered_with_issue':
    case 'amount_mismatch':
      return { label: s === 'delivered_with_issue' ? 'Delivered (with issue)' : pretty(s), tone: 'danger' };
    case 'individual':
    case 'buyer':
      return { label: 'Individual', tone: 'neutral' };
    case 'retailer':
    case 'seller':
      return { label: 'Retailer', tone: 'neutral' };
    case 'wholesaler':
      return { label: 'Wholesaler', tone: 'warning' };
    case 'crm_agent':
      return { label: 'CRM agent', tone: 'brand' };
    case 'admin':
      return { label: 'Admin', tone: 'neutral' };
    default:
      return { label: pretty(s), tone: 'neutral' };
  }
}

/** Unpaid past the payment window: shown as "Expired". */
export function displayOrderStatus(order: { status?: string | null; cancellation_reason?: string | null; cancel_reason?: string | null }): string {
  const status = String(order.status ?? '').toLowerCase();
  if (status === 'cancelled') {
    const reason = String(order.cancellation_reason ?? order.cancel_reason ?? '').toLowerCase();
    if (reason === 'payment_expired') return 'expired';
  }
  return status;
}

export function isAwaitingPayment(order: { status?: string | null; payment_status?: string | null }): boolean {
  return String(order.status ?? '').toLowerCase() === 'pending_payment' && String(order.payment_status ?? '').toLowerCase() !== 'paid';
}
