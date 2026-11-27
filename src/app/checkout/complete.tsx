import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Loader, Screen, Text } from '@/components/ui';
import { verifyPayment } from '@/services/buyer';
import { useCart } from '@/store/cart';

type State = 'checking' | 'paid' | 'pending' | 'failed' | 'missing';

function classify(res: { paid: boolean; payment_status?: string | null }): State {
  const status = String(res.payment_status ?? '').toLowerCase();
  if (res.paid || status === 'paid') return 'paid';
  if (status === 'failed' || status === 'amount_mismatch') return 'failed';
  return 'pending';
}

/** Payment confirmation (web /checkout/complete): asks the API, never assumes. */
export default function CheckoutComplete() {
  const { reference, trxref } = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const ref = reference || trxref || '';
  const [state, setState] = useState<State>(ref ? 'checking' : 'missing');
  const { reload } = useCart();

  const verify = useCallback(
    () =>
      verifyPayment(ref)
        .then(classify)
        .catch((): State => 'pending')
        .finally(() => reload()),
    [ref, reload],
  );

  const check = () => {
    if (!ref) return;
    setState('checking');
    verify().then(setState);
  };

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    verify().then((next) => alive && setState(next));
    return () => {
      alive = false;
    };
  }, [ref, verify]);

  return (
    <Screen title="Payment" back={false} narrow>
      {state === 'checking' ? (
        <Loader label="Confirming your payment…" />
      ) : state === 'paid' ? (
        <EmptyState illustration="success" title="Payment received" description="Thank you! The vendor has been told and will prepare your order." />
      ) : state === 'failed' ? (
        <EmptyState illustration="error" title="Payment failed" description="The payment didn't go through. You can try again from My Orders." />
      ) : state === 'pending' ? (
        <EmptyState illustration="cold-chain-delivery" title="Waiting for Paystack" description="We haven't received confirmation yet. If you completed the payment, check again in a moment." action="Check again" onAction={check} />
      ) : (
        <EmptyState illustration="no-results" title="No payment to confirm" description="Open My Orders to pay for or track an order." />
      )}
      <View style={{ gap: 10 }}>
        <Button label="View my orders" variant="ink" full onPress={() => router.replace('/buyer/orders')} />
        <Button label="Continue shopping" variant="outline" full onPress={() => router.replace('/(tabs)')} />
        {ref ? (
          <Text variant="caption" align="center">
            Payment reference: {ref}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
