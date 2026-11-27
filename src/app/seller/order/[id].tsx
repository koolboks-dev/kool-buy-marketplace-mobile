import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Glyph,
  InfoRow,
  Input,
  Loader,
  RadioList,
  Screen,
  Sheet,
  SmartImage,
  StatusBadge,
  Text,
  useToast,
  Well,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { flagSellerOrderItem, listSellerOrders, markOrderDelivered, markOrderReady, setSellerAvailability } from '@/services/seller';
import type { SellerOrder, SellerOrderItem } from '@/services/types';
import { getCached, putMany } from '@/store/cache';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

async function findOrder(id: string): Promise<SellerOrder | null> {
  for (let page = 1; page <= 10; page++) {
    const r = await listSellerOrders(page, 50);
    putMany('seller-order', r.orders ?? []);
    const hit = (r.orders ?? []).find((o) => o.id === id);
    if (hit) return hit;
    if (!r.pagination?.has_next) break;
  }
  return null;
}

/** A seller order: confirm availability, get it ready, hand it over (web OrderDetailsModal). */
export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { user, isWholesaler } = useSession();
  const market = user?.market;
  const q = useAsync(() => (getCached<SellerOrder>('seller-order', id) ? Promise.resolve(getCached<SellerOrder>('seller-order', id)!) : findOrder(id)), [id]);
  const [busy, setBusy] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [flagItem, setFlagItem] = useState<SellerOrderItem | null>(null);

  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [reservation, setReservation] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [driver, setDriver] = useState({ name: '', phone: '', vehicle: '', eta: '' });
  const [flagType, setFlagType] = useState<'unavailable' | 'short'>('unavailable');
  const [flagQty, setFlagQty] = useState('');
  const [flagNote, setFlagNote] = useState('');

  const o = q.data;
  const refresh = async () => {
    const fresh = await findOrder(id);
    if (fresh) q.setData(fresh);
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.show(ok, 'success');
      setAvailOpen(false);
      setReadyOpen(false);
      setFlagItem(null);
      await refresh();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (q.loading) return <Screen title="Order"><Loader /></Screen>;
  if (!o) return <Screen title="Order"><EmptyState illustration="no-orders-yet" title="Order not found" /></Screen>;

  const st = o.status.toLowerCase();
  const needsAvailability = st === 'new' || st === 'awaiting_confirmation';
  const canReady = ['confirmed', 'processing', 'paid'].includes(st) && !o.koolboks_delivery && !o.on_hold;
  const canDeliver = ['ready_for_dispatch', 'in_transit', 'out_for_delivery', 'ready', 'picked_up'].includes(st) && !o.koolboks_delivery;

  return (
    <Screen title={o.order_number} subtitle={o.customer_name} narrow refreshing={q.refreshing} onRefresh={refresh}>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={o.status} kind="order" />
          {o.payment_status ? <StatusBadge status={o.payment_status} /> : null}
          <Badge label={o.reservation_type === 'pickup' ? 'Pickup' : 'Delivery'} icon={o.reservation_type === 'pickup' ? 'store' : 'truck'} />
          {o.koolboks_delivery ? <Badge label="Koolboks delivers" tone="brand" icon="truck" /> : null}
        </View>
        {o.on_hold ? (
          <Well>
            <Text weight="semibold" color={colors.text}>
              On hold
            </Text>
            <Text variant="caption">{o.hold_reason || 'Procurement is resolving an item issue on this order.'}</Text>
          </Well>
        ) : null}
        {o.koolboks_delivery && o.delivery ? <InfoRow label="Koolboks delivery" value={o.delivery.status_display} icon="truck" last /> : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text variant="subtitle">Items</Text>
        {o.items.map((it) => {
          const off = it.is_available === false || o.unavailable_item_ids?.includes(it.id);
          return (
            <View key={it.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', opacity: off ? 0.5 : 1 }}>
              <SmartImage uri={it.image_url} style={{ width: 46, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
              <View style={{ flex: 1 }}>
                <Text weight="medium" color={colors.text} numberOfLines={2}>
                  {it.name}
                </Text>
                <Text variant="caption">
                  {it.quantity} {it.unit} × {formatMoney(it.unit_price, market)}
                  {off ? ' · Unavailable' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="semibold" color={colors.text}>
                  {formatMoney(it.subtotal, market)}
                </Text>
                {isWholesaler && !off ? (
                  <Pressable onPress={() => setFlagItem(it)} hitSlop={6}>
                    <Text variant="link" size={12}>
                      Flag issue
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
        <Divider />
        <InfoRow label="Subtotal" value={formatMoney(o.subtotal, market)} />
        <InfoRow label="Delivery fee" value={o.delivery_fee ? formatMoney(o.delivery_fee, market) : '—'} />
        <InfoRow label="Total" value={formatMoney(o.grand_total ?? o.subtotal, market)} last />
      </Card>

      <Card style={{ gap: 4 }}>
        <Text variant="subtitle">Customer</Text>
        <InfoRow label="Name" value={o.customer_name} icon="user" />
        <InfoRow label="Phone" value={o.customer_phone} icon="phone" />
        <InfoRow label="Contact by" value={titleCase(o.preferred_contact)} />
        <InfoRow label="Address" value={o.delivery_address} icon="location" last />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Button label="Call" icon="phone" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.customer_phone}`)} />
          <Button label="WhatsApp" icon="whatsapp" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${o.customer_phone.replace(/\D/g, '').replace(/^0/, '234')}`)} />
        </View>
      </Card>

      {o.rider || o.logistics_details?.driver_name || o.logistics_details?.pickup_code ? (
        <Card style={{ gap: 4 }}>
          <Text variant="subtitle">Fulfilment</Text>
          {o.rider?.name || o.logistics_details?.driver_name ? <InfoRow label="Rider" value={o.rider?.name ?? o.logistics_details?.driver_name} icon="bike" /> : null}
          {o.rider?.phone || o.logistics_details?.driver_phone ? <InfoRow label="Rider phone" value={o.rider?.phone ?? o.logistics_details?.driver_phone} /> : null}
          {o.logistics_details?.pickup_code ? <InfoRow label="Pickup code" value={o.logistics_details.pickup_code} /> : null}
          {o.paid_at ? <InfoRow label="Paid" value={formatDateTime(o.paid_at)} last /> : null}
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        {needsAvailability ? (
          <Button
            label="Confirm availability"
            variant="ink"
            icon="check"
            full
            onPress={() => {
              setUnavailable(o.unavailable_item_ids ?? []);
              setReservation(o.reservation_type);
              setDeliveryFee(o.delivery_fee ? String(o.delivery_fee) : '');
              setAvailOpen(true);
            }}
          />
        ) : null}
        {needsAvailability ? (
          <Button
            label="I can't fulfil this order"
            variant="ghost"
            full
            onPress={() => run(() => setSellerAvailability(o.id, { available: 'none', reservation_type: o.reservation_type }), 'Buyer has been told')}
          />
        ) : null}
        {canReady ? <Button label={o.reservation_type === 'pickup' ? 'Ready for pickup' : 'Ready for dispatch'} variant="ink" icon="box" full onPress={() => setReadyOpen(true)} /> : null}
        {canDeliver ? <Button label="Mark as delivered" variant="ink" icon="check-circle" full loading={busy} onPress={() => run(() => markOrderDelivered(o.id), 'Marked as delivered')} /> : null}
      </View>

      <Sheet
        visible={availOpen}
        onClose={() => setAvailOpen(false)}
        title="Confirm availability"
        subtitle="Untick anything you can't supply."
        footer={
          <Button
            label="Confirm"
            variant="ink"
            full
            loading={busy}
            onPress={() =>
              run(
                () =>
                  setSellerAvailability(o.id, {
                    available: unavailable.length === 0 ? 'all' : unavailable.length >= o.items.length ? 'none' : 'partial',
                    unavailable_item_ids: unavailable,
                    reservation_type: reservation,
                    delivery_available: reservation === 'delivery',
                    delivery_fee: reservation === 'delivery' && deliveryFee ? Number(deliveryFee).toFixed(2) : undefined,
                  }),
                'Availability confirmed',
              )
            }
          />
        }
      >
        {o.items.map((it) => {
          const on = !unavailable.includes(it.id);
          return (
            <Pressable
              key={it.id}
              onPress={() => setUnavailable((u) => (on ? [...u, it.id] : u.filter((x) => x !== it.id)))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: on ? colors.brand : colors.border, backgroundColor: on ? colors.brandSoft : colors.surface }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: on ? colors.brand : colors.borderStrong, backgroundColor: on ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Glyph name="check" size={14} color="#FFFFFF" strokeWidth={2.4} /> : null}
              </View>
              <Text style={{ flex: 1 }} color={colors.text}>
                {it.name} · {it.quantity} {it.unit}
              </Text>
            </Pressable>
          );
        })}
        <Text variant="label">How will the buyer get it?</Text>
        <RadioList
          value={reservation}
          onChange={setReservation}
          options={[
            { value: 'delivery', label: 'Delivery' },
            { value: 'pickup', label: 'Pickup at my store' },
          ]}
        />
        {reservation === 'delivery' ? <Input label="Delivery fee (optional)" value={deliveryFee} onChangeText={(t) => setDeliveryFee(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /> : null}
      </Sheet>

      <Sheet
        visible={readyOpen}
        onClose={() => setReadyOpen(false)}
        title={o.reservation_type === 'pickup' ? 'Ready for pickup' : 'Ready for dispatch'}
        footer={
          <Button
            label="Confirm"
            variant="ink"
            full
            loading={busy}
            onPress={() =>
              run(
                () =>
                  markOrderReady(
                    o.id,
                    o.reservation_type === 'pickup'
                      ? { type: 'pickup', pickup_code: pickupCode || undefined }
                      : { type: 'delivery', driver_name: driver.name || undefined, driver_phone: driver.phone || undefined, vehicle_type: driver.vehicle || undefined, eta_minutes: driver.eta ? Number(driver.eta) : undefined },
                  ),
                'Order is ready',
              )
            }
          />
        }
      >
        {o.reservation_type === 'pickup' ? (
          <Input label="Pickup code (optional)" value={pickupCode} onChangeText={setPickupCode} hint="The buyer shows this code when they collect." />
        ) : (
          <>
            <Input label="Driver name" value={driver.name} onChangeText={(t) => setDriver((d) => ({ ...d, name: t }))} />
            <Input label="Driver phone" value={driver.phone} onChangeText={(t) => setDriver((d) => ({ ...d, phone: t }))} keyboardType="phone-pad" />
            <Input label="Vehicle" value={driver.vehicle} onChangeText={(t) => setDriver((d) => ({ ...d, vehicle: t }))} placeholder="Bike, van…" />
            <Input label="ETA (minutes)" value={driver.eta} onChangeText={(t) => setDriver((d) => ({ ...d, eta: t.replace(/\D/g, '') }))} keyboardType="number-pad" />
          </>
        )}
      </Sheet>

      <Sheet
        visible={Boolean(flagItem)}
        onClose={() => setFlagItem(null)}
        title="Flag an item"
        subtitle={flagItem?.name}
        footer={
          <Button
            label="Flag item"
            variant="ink"
            full
            loading={busy}
            onPress={() =>
              flagItem &&
              run(
                () => flagSellerOrderItem(o.id, flagItem.id, { issue_type: flagType, available_qty: flagType === 'short' && flagQty ? Number(flagQty) : undefined, note: flagNote || undefined }),
                'Procurement has been told',
              )
            }
          />
        }
      >
        <RadioList
          value={flagType}
          onChange={setFlagType}
          options={[
            { value: 'unavailable', label: 'Not available' },
            { value: 'short', label: 'Short — I have less' },
          ]}
        />
        {flagType === 'short' ? <Input label="Quantity you have" value={flagQty} onChangeText={(t) => setFlagQty(t.replace(/\D/g, ''))} keyboardType="number-pad" /> : null}
        <Input label="Note (optional)" value={flagNote} onChangeText={setFlagNote} multiline />
      </Sheet>
    </Screen>
  );
}
