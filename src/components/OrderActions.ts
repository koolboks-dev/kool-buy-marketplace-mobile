import { errorMessage } from '@/lib/api';
import { payWithPaystack, PAYSTACK_CALLBACK_URL } from '@/lib/paystack';
import { initializePayment, paystackEmail } from '@/services/buyer';
import type { BuyerOrder } from '@/services/types';

/** "Pay now" on an unpaid order: start a Paystack payment for it, then confirm on return. */
export async function payForOrder(order: BuyerOrder, email?: string | null, onError?: (msg: string) => void) {
  try {
    const res = await initializePayment(order.id, PAYSTACK_CALLBACK_URL, paystackEmail(email ?? order.delivery_info?.buyer_email, order.delivery_info?.buyer_phone));
    await payWithPaystack(res.authorization_url, res.reference);
  } catch (err) {
    onError?.(errorMessage(err, 'Could not start the payment.'));
  }
}

const s = (o: BuyerOrder) => String(o.status).toLowerCase();
export const canCancel = (o: BuyerOrder) => ['new', 'pending_payment', 'pending_credit_review'].includes(s(o)) && o.payment_status !== 'paid';
export const canConfirm = (o: BuyerOrder) => ['in_transit', 'out_for_delivery', 'arrived', 'processing', 'confirmed'].includes(s(o)) && o.payment_status === 'paid';
export const canReview = (o: BuyerOrder) => s(o) === 'delivered' || s(o) === 'completed';
