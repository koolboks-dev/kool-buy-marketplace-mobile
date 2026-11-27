import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Badge, Button, Card, Divider, ErrorState, InfoRow, ListSkeleton, PromptSheet, Screen, StatusBadge, Text, useToast, Well } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney, parseMoney, titleCase } from '@/lib/format';
import { cancelAdminOrder, getAdminOrder } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** Order detail (web /admin/orders/[id]). */
export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getAdminOrder(id).then((r) => r.order), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const o = q.data;
  const cur = o?.currency;
  const cancellable = o && !['delivered', 'completed', 'cancelled', 'expired'].includes(o.status.toLowerCase());

  return (
    <Screen title={o?.order_number ?? 'Order'} subtitle={o ? `${o.buyer_name} → ${o.seller_name}` : undefined} narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/orders">
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error || !o ? (
        <ErrorState message={q.error ?? 'Order not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={o.status} kind="order" />
              {o.payment_status ? <StatusBadge status={o.payment_status} /> : null}
              {o.reservation_type ? <Badge label={titleCase(o.reservation_type)} /> : null}
              {o.procurement_status ? <Badge label={`Procurement: ${titleCase(o.procurement_status)}`} tone="brand" /> : null}
            </View>
            {o.on_hold ? (
              <Well>
                <Text weight="semibold" color={colors.text}>
                  On hold
                </Text>
                <Text variant="caption">{o.hold_reason || 'An item issue is being resolved.'}</Text>
              </Well>
            ) : null}
            <InfoRow label="Placed" value={formatDateTime(o.created_at)} />
            <InfoRow label="Confirmed" value={formatDateTime(o.confirmed_at)} />
            <InfoRow label="Delivered" value={formatDateTime(o.delivered_at)} />
            {o.cancelled_at ? <InfoRow label="Cancelled" value={formatDateTime(o.cancelled_at)} /> : null}
            <InfoRow label="Payment method" value={titleCase(o.payment_method || '—')} last />
          </Card>

          <Card style={{ gap: 8 }}>
            <Text variant="subtitle">Items</Text>
            {o.items.map((it, i) => {
              const sub = it.subtotal ?? parseMoney(it.unit_price) * it.quantity;
              return (
                <View key={it.id ?? i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="medium" color={colors.text}>
                      {it.product_name}
                    </Text>
                    <Text variant="caption">
                      {it.quantity} {it.unit} × {formatMoney(it.unit_price, cur)}
                    </Text>
                  </View>
                  <Text weight="semibold" color={colors.text}>
                    {formatMoney(sub, cur)}
                  </Text>
                </View>
              );
            })}
            <Divider />
            <InfoRow label="Delivery fee" value={formatMoney(o.delivery_fee, cur)} />
            <InfoRow label="Total" value={formatMoney(o.total_amount, cur)} last />
          </Card>

          <Card padding={14}>
            <Text variant="subtitle" style={{ marginBottom: 4 }}>
              Buyer
            </Text>
            <InfoRow label="Name" value={o.buyer_name} />
            <InfoRow label="Phone" value={o.buyer_phone} />
            {o.buyer_email ? <InfoRow label="Email" value={o.buyer_email} /> : null}
            <InfoRow label="Contact by" value={titleCase(o.contact_method || '—')} />
            <InfoRow label="Address" value={o.delivery_address} last />
            {o.special_instructions ? <Text variant="caption" style={{ marginTop: 6 }}>Note: {o.special_instructions}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button label="Call buyer" icon="phone" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.buyer_phone}`)} />
              <Button label="Call seller" icon="phone" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.seller_phone}`)} />
            </View>
          </Card>

          {o.fulfillment ? (
            <Card padding={14}>
              <Text variant="subtitle" style={{ marginBottom: 4 }}>
                Fulfilment
              </Text>
              <InfoRow label="Type" value={titleCase(o.fulfillment.type || '—')} />
              <InfoRow label="Driver" value={o.fulfillment.driver_name} />
              <InfoRow label="Driver phone" value={o.fulfillment.driver_phone} />
              <InfoRow label="Vehicle" value={o.fulfillment.vehicle_type} last />
            </Card>
          ) : null}

          {o.issues?.length ? (
            <Card style={{ gap: 8 }}>
              <Text variant="subtitle">Item issues</Text>
              {o.issues.map((iss) => (
                <Well key={iss.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text weight="medium" color={colors.text}>
                      {iss.item?.name ?? 'Item'} · {titleCase(iss.issue_type)}
                    </Text>
                    <StatusBadge status={iss.status} />
                  </View>
                  {iss.note ? <Text variant="caption">{iss.note}</Text> : null}
                </Well>
              ))}
            </Card>
          ) : null}

          {cancellable && can(['orders.edit', 'orders.*', 'orders.cancel']) ? <Button label="Cancel order" variant="destructive" full onPress={() => setCancelOpen(true)} /> : null}
          <PromptSheet
            visible={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title="Cancel this order?"
            description="This cancels the order and releases its reserved stock."
            required={false}
            destructive
            confirmLabel="Cancel order"
            onConfirm={async (reason) => {
              try {
                await cancelAdminOrder(o.id, reason || undefined);
                toast.show('Order cancelled', 'success');
                setCancelOpen(false);
                q.reload();
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}
