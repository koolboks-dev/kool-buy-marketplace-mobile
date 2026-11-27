import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  RadioList,
  Screen,
  SmartImage,
  Text,
  useToast,
  Well,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { apiErrorCode, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { payWithPaystack, PAYSTACK_CALLBACK_URL } from '@/lib/paystack';
import { getOrderRequestSummary, paystackEmail, submitOrderRequest } from '@/services/buyer';
import type { OrderRequestResponse } from '@/services/types';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

/** Checkout (web /checkout): delivery address, contact, timing, payment method → place order → Paystack. */
export default function CheckoutScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const { reload: reloadCart } = useCart();
  const toast = useToast();

  const q = useAsync(() => getOrderRequestSummary(), []);
  const s = q.data;
  const [addressEdit, setAddressId] = useState<string | null>(null);
  const [phoneEdit, setPhone] = useState<string | null>(null);
  const [contact, setContact] = useState<'phone' | 'whatsapp'>('phone');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<'paystack' | 'financing'>('paystack');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderRequestResponse | null>(null);

  const financing = (s?.financing ?? null) as { eligible?: boolean; available?: string | number; tenors?: { days: number; label?: string }[]; tenor_days?: number[] } | null;
  const canFinance = Boolean(financing?.eligible);
  const tenor = financing?.tenors?.[0]?.days ?? financing?.tenor_days?.[0];

  const phone = phoneEdit ?? (s?.buyer_phone || user?.phone_number || '');
  const addressId = addressEdit ?? s?.addresses.find((x) => x.is_default)?.id ?? s?.addresses[0]?.id ?? null;

  const market = user?.market;
  const subtotal = s?.total_price ?? 0;
  const shipping = s?.shipping_total ?? 0;
  const total = s?.grand_total ?? subtotal + shipping;

  const place = async () => {
    setError(null);
    if (!addressId) return setError('Choose a delivery address to place your order.');
    if (!phone.trim()) return setError('Enter a phone number the vendor can reach you on.');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Use the date format YYYY-MM-DD.');
    if (date && new Date(date).getTime() < new Date(new Date().toDateString()).getTime()) return setError('Delivery date cannot be in the past.');
    const addr = s?.addresses.find((a) => a.id === addressId);
    const payLater = method === 'financing' && canFinance;
    setSubmitting(true);
    try {
      const res = await submitOrderRequest({
        phone_number: phone.trim(),
        customer_email: paystackEmail(user?.email, phone),
        contact_method: contact,
        delivery_address_id: addressId,
        preferred_delivery_time: date || undefined,
        special_instructions: notes.trim() || undefined,
        callback_url: PAYSTACK_CALLBACK_URL,
        payment_method: payLater ? 'financing' : 'paystack',
        financing_tenor_days: payLater ? tenor : undefined,
        ...(addr?.latitude != null && addr?.longitude != null ? { delivery_latitude: Number(addr.latitude), delivery_longitude: Number(addr.longitude) } : {}),
      });
      await reloadCart();
      if (payLater || !res.payment?.authorization_url) {
        setDone(res);
        toast.show(payLater ? 'Sent for credit review' : 'Order placed', 'success');
        return;
      }
      toast.show('Order created — taking you to Paystack to pay', 'info');
      await payWithPaystack(res.payment.authorization_url, res.payment.reference);
    } catch (err) {
      const code = apiErrorCode(err);
      setError(errorMessage(err, 'Could not place your order.'));
      if (code === 'price_changed' || code === 'insufficient_stock') q.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Screen title="Order placed" back={false}>
        <EmptyState
          illustration="success"
          title={done.financing ? 'Sent for credit review' : 'Your order is in'}
          description={
            done.financing
              ? 'Our credit team will review your pay-later request. You will get a notification when it is decided.'
              : done.payment_error || 'You can pay and track it from My Orders.'
          }
        >
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 12 }}>
            {done.orders.map((o) => (
              <Well key={o.order_number}>
                <Text weight="semibold" color={colors.text}>
                  {o.vendor_name}
                </Text>
                <Text variant="caption">
                  {o.order_number} · {formatMoney(o.total ?? o.subtotal, market)}
                </Text>
              </Well>
            ))}
            <Button label="View my orders" variant="ink" full onPress={() => router.replace('/buyer/orders')} />
            <Button label="Continue shopping" variant="outline" full onPress={() => router.replace('/(tabs)')} />
          </View>
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen
      title="Checkout"
      subtitle="Review and place your order"
      narrow
      footer={
        s && s.items.length ? (
          <View style={{ gap: 10 }}>
            {error ? (
              <Text variant="caption" color={colors.danger}>
                {error}
              </Text>
            ) : null}
            <Button
              label={method === 'financing' && canFinance ? `Request pay later · ${formatMoney(total, market)}` : `Place order & pay · ${formatMoney(total, market)}`}
              variant="primary"
              size="lg"
              full
              loading={submitting}
              disabled={s.minimum ? !s.minimum.met : false}
              onPress={place}
            />
          </View>
        ) : undefined
      }
    >
      {q.loading ? (
        <ListSkeleton rows={4} height={120} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : !s || s.items.length === 0 ? (
        <EmptyState illustration="empty-cart" title="Nothing to check out" description="Your cart is empty." action="Start shopping" onAction={() => router.replace('/(tabs)/browse')} />
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <Text variant="subtitle">Items ({s.items.length})</Text>
            {s.items.map((it) => (
              <View key={it.product_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SmartImage uri={it.image_url} style={{ width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
                <View style={{ flex: 1 }}>
                  <Text weight="medium" color={colors.text} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text variant="caption">
                    {it.quantity} × {formatMoney(it.price, market)}
                  </Text>
                </View>
                <Text weight="semibold" color={colors.text}>
                  {formatMoney(it.subtotal, market)}
                </Text>
              </View>
            ))}
            <Divider />
            <Line label="Subtotal" value={formatMoney(subtotal, market)} />
            <Line label="Shipping" value={shipping ? formatMoney(shipping, market) : 'Free'} />
            <Line label="Total" value={formatMoney(total, market)} strong />
            {s.minimum && !s.minimum.met ? <Badge label={s.minimum.message ?? 'Minimum order not reached'} tone="warning" /> : null}
          </Card>

          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="subtitle">Delivery address</Text>
              <Button label="Add" icon="plus" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/buyer/addresses', params: { add: '1' } })} />
            </View>
            {s.addresses.length === 0 ? (
              <Well>
                <Text variant="secondary">Add a delivery address so the vendor and rider know where to bring your order.</Text>
                <Button label="Add an address" variant="outline" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/buyer/addresses', params: { add: '1' } })} />
              </Well>
            ) : (
              <RadioList
                value={addressId}
                onChange={setAddressId}
                options={s.addresses.map((a) => ({
                  value: a.id,
                  label: `${a.label.charAt(0).toUpperCase()}${a.label.slice(1)}${a.is_default ? ' · Default' : ''}`,
                  description: [a.street, a.city, a.state].filter(Boolean).join(', '),
                }))}
              />
            )}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text variant="subtitle">Contact</Text>
            <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="phone" />
            <RadioList
              value={contact}
              onChange={setContact}
              options={[
                { value: 'phone', label: 'Phone call' },
                { value: 'whatsapp', label: 'WhatsApp' },
              ]}
            />
            <Input label="Preferred delivery date (optional)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" icon="calendar" hint="Any day — pick a date if you have a preference." />
            <Input label="Special instructions (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Gate code, landmark, when to call…" />
          </Card>

          <Card style={{ gap: 10 }}>
            <Text variant="subtitle">Payment</Text>
            <RadioList
              value={method}
              onChange={setMethod}
              options={[
                { value: 'paystack', label: 'Pay now with Paystack', description: 'Card, bank transfer or USSD. Stock is held for 30 minutes.' },
                ...(canFinance
                  ? [{ value: 'financing' as const, label: 'Inventory financing (pay later)', description: `Available credit: ${formatMoney(financing?.available ?? 0, market)}${tenor ? ` · ${tenor} days` : ''}` }]
                  : []),
              ]}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'subtitle' : 'secondary'}>{label}</Text>
      <Text weight={strong ? 'bold' : 'medium'} color={colors.text}>
        {value}
      </Text>
    </View>
  );
}
