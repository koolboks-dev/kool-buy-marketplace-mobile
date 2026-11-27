import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { canCancel, canConfirm, canReview, payForOrder } from '@/components/OrderActions';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  InfoRow,
  Input,
  Loader,
  PromptSheet,
  Screen,
  Sheet,
  SmartImage,
  StarIcon,
  StatusBadge,
  Text,
  useToast,
  Well,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { displayOrderStatus, isAwaitingPayment } from '@/lib/status';
import { cancelBuyerOrder, confirmBuyerDelivery, listBuyerOrders, reorderBuyerOrder, submitProductReview, submitVendorReview } from '@/services/buyer';
import type { BuyerOrder } from '@/services/types';
import { getCached, putMany } from '@/store/cache';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

async function findOrder(id: string): Promise<BuyerOrder | null> {
  for (let page = 1; page <= 10; page++) {
    const r = await listBuyerOrders(page, 50);
    putMany('buyer-order', r.items ?? []);
    const hit = (r.items ?? []).find((o) => o.id === id);
    if (hit) return hit;
    if (!r.pagination?.has_next) break;
  }
  return null;
}

const STEPS = ['pending_payment', 'new', 'confirmed', 'processing', 'in_transit', 'delivered'];

/** One order: items, totals, delivery, rider, timeline and actions. */
export default function BuyerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useSession();
  const { reload: reloadCart } = useCart();
  const cached = getCached<BuyerOrder>('buyer-order', id);
  const q = useAsync(() => (cached ? Promise.resolve(cached) : findOrder(id)), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const o = q.data;
  const refreshOrder = async () => {
    const fresh = await findOrder(id);
    if (fresh) q.setData(fresh);
  };

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.show(ok, 'success');
      await refreshOrder();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (q.loading) return <Screen title="Order"><Loader /></Screen>;
  if (!o) return <Screen title="Order"><EmptyState illustration="no-orders-yet" title="Order not found" /></Screen>;

  const status = displayOrderStatus(o);
  const stepIndex = STEPS.indexOf(status === 'out_for_delivery' ? 'in_transit' : status);
  const rider = o.rider ?? (o.logistics_details ? { name: o.logistics_details.driver_name, phone: o.logistics_details.driver_phone, vehicle: o.logistics_details.vehicle_type, eta_minutes: o.logistics_details.eta_minutes } : null);

  return (
    <Screen title={o.order_number} subtitle={o.vendor?.name} refreshing={q.refreshing} onRefresh={refreshOrder} narrow>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusBadge status={status} kind="order" />
          <Text variant="caption">{formatDateTime(o.timestamps?.created_at)}</Text>
        </View>
        {stepIndex >= 0 ? (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {STEPS.map((sname, i) => (
              <View key={sname} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= stepIndex ? colors.brand : colors.mutedStrong }} />
            ))}
          </View>
        ) : null}
        {isAwaitingPayment(o) ? (
          <Well>
            <Text weight="semibold" color={colors.text}>
              Waiting for your payment
            </Text>
            <Text variant="caption">Stock is held for 30 minutes after you place the order{o.payment_due_at ? ` (until ${formatDateTime(o.payment_due_at)})` : ''}.</Text>
            <Button label="Pay now" variant="primary" icon="card" style={{ marginTop: 10 }} onPress={() => payForOrder(o, user?.email, (m) => toast.show(m, 'error'))} />
          </Well>
        ) : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text variant="subtitle">Items</Text>
        {o.items.map((it) => {
          const unavailable = it.is_available === false;
          return (
            <View key={it.item_id ?? it.product_id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', opacity: unavailable ? 0.5 : 1 }}>
              <SmartImage uri={it.image_url} style={{ width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
              <View style={{ flex: 1 }}>
                <Text weight="medium" color={colors.text} numberOfLines={2}>
                  {it.product_name}
                </Text>
                <Text variant="caption">
                  {it.quantity} {it.unit} × {formatMoney(it.unit_price, o.market)}
                  {unavailable ? ' · Unavailable' : ''}
                </Text>
              </View>
              <Text weight="semibold" color={colors.text}>
                {formatMoney(it.subtotal, o.market)}
              </Text>
            </View>
          );
        })}
        <Divider />
        <InfoRow label="Subtotal" value={formatMoney(o.subtotal, o.market)} />
        <InfoRow label="Delivery fee" value={o.delivery_fee ? formatMoney(o.delivery_fee, o.market) : 'Free'} />
        <InfoRow label="Total" value={formatMoney(o.grand_total ?? o.total_amount, o.market)} last />
      </Card>

      <Card style={{ gap: 4 }}>
        <Text variant="subtitle">{o.reservation_type === 'pickup' ? 'Pickup' : 'Delivery'}</Text>
        {o.reservation_type === 'pickup' && o.pickup_details ? (
          <>
            <InfoRow label="Pickup code" value={o.pickup_details.pickup_code} />
            <InfoRow label="Shop address" value={o.pickup_details.shop_address} />
            <InfoRow label="Pickup time" value={o.pickup_details.pickup_time} last />
          </>
        ) : (
          <>
            <InfoRow label="Address" value={o.delivery_info?.delivery_address} icon="location" />
            <InfoRow label="Contact" value={`${titleCase(o.delivery_info?.contact_method)} · ${o.delivery_info?.buyer_phone ?? ''}`} icon="phone" last={!rider} />
            {rider?.name ? (
              <>
                <InfoRow label="Rider" value={`${rider.name}${rider.vehicle ? ` · ${rider.vehicle}` : ''}`} icon="bike" />
                {rider.eta_minutes ? <InfoRow label="ETA" value={`${rider.eta_minutes} min`} /> : null}
                {rider.phone ? <Button label="Call rider" icon="phone" variant="outline" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${rider.phone}`)} /> : null}
              </>
            ) : null}
          </>
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <Text variant="subtitle">Payment</Text>
        <InfoRow label="Status" value={<StatusBadge status={o.payment_status || 'unpaid'} />} />
        <InfoRow label="Method" value={titleCase(o.payment_method || '—')} />
        {o.payment_reference ? <InfoRow label="Reference" value={o.payment_reference} /> : null}
        <InfoRow label="Paid at" value={o.paid_at ? formatDateTime(o.paid_at) : '—'} last />
        {o.invoice_id ? <Button label="View invoice" icon="document" variant="outline" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => router.push('/invoices')} /> : null}
      </Card>

      <Card padding={0}>
        <Pressable onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: o.vendor.seller_id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <Avatar uri={o.vendor?.logo_url} name={o.vendor?.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text weight="semibold" color={colors.text}>
              {o.vendor?.name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {o.vendor?.address}
            </Text>
          </View>
        </Pressable>
        {o.vendor?.phone || o.vendor?.whatsapp ? (
          <View style={{ flexDirection: 'row', gap: 8, padding: 14, paddingTop: 0 }}>
            {o.vendor.phone ? <Button label="Call" icon="phone" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.vendor.phone}`)} /> : null}
            {o.vendor.whatsapp ? (
              <Button label="WhatsApp" icon="whatsapp" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${o.vendor.whatsapp.replace(/\D/g, '')}`)} />
            ) : null}
          </View>
        ) : null}
      </Card>

      <View style={{ gap: 10 }}>
        {canConfirm(o) ? <Button label="I received my order" variant="ink" icon="check" full loading={busy === 'confirm'} onPress={() => act('confirm', () => confirmBuyerDelivery(o.id), 'Thanks! Delivery confirmed.')} /> : null}
        {canReview(o) ? <Button label="Rate this order" variant="outline" icon="star" full onPress={() => setReviewOpen(true)} /> : null}
        <Button
          label="Order again"
          variant="outline"
          icon="refresh"
          full
          loading={busy === 'reorder'}
          onPress={() =>
            act('reorder', async () => {
              await reorderBuyerOrder(o.id);
              await reloadCart();
              router.push('/(tabs)/cart');
            }, 'Items added to your cart')
          }
        />
        {canCancel(o) ? <Button label="Cancel order" variant="ghost" full onPress={() => setCancelOpen(true)} /> : null}
      </View>

      <PromptSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        description="The vendor will be told and any reserved stock released."
        required={false}
        destructive
        confirmLabel="Cancel order"
        onConfirm={async (reason) => {
          setCancelOpen(false);
          await act('cancel', () => cancelBuyerOrder(o.id, reason || undefined), 'Order cancelled');
        }}
      />

      <Sheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Rate your order"
        subtitle={o.vendor?.name}
        footer={
          <Button
            label="Submit review"
            variant="ink"
            full
            loading={busy === 'review'}
            onPress={async () => {
              setBusy('review');
              try {
                await submitVendorReview({ order_id: o.id, rating, comment: comment || undefined });
                await Promise.all(o.items.map((it) => submitProductReview({ order_id: o.id, product_id: it.product_id, rating, comment: comment || undefined }).catch(() => null)));
                toast.show('Thanks for your review!', 'success');
                setReviewOpen(false);
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              } finally {
                setBusy(null);
              }
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stars`} hitSlop={4}>
              <StarIcon size={36} empty={n > rating} emptyColor={colors.borderStrong} />
            </Pressable>
          ))}
        </View>
        <Input label="Comment (optional)" value={comment} onChangeText={setComment} multiline placeholder="How was the quality and delivery?" />
      </Sheet>
    </Screen>
  );
}
