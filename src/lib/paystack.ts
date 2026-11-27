import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { WEB_BASE_URL } from './config';

/** Where Paystack sends the buyer after paying — the web marketplace's confirmation page. */
export const PAYSTACK_CALLBACK_URL = `${WEB_BASE_URL}/checkout/complete`;

/**
 * Open Paystack's hosted checkout in the in-app browser. When the buyer closes
 * it, go to the confirmation screen, which asks the API (verifyPayment) whether
 * the payment went through — the client never decides "paid" by itself.
 */
export async function payWithPaystack(authorizationUrl: string, reference: string) {
  await WebBrowser.openBrowserAsync(authorizationUrl, {
    dismissButtonStyle: 'done',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
  router.push({ pathname: '/checkout/complete', params: { reference } });
}
