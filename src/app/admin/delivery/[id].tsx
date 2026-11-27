import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ErrorState, InfoRow, Input, ListSkeleton, PromptSheet, Screen, Sheet, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { deliveryAction, getLogisticsDelivery, getRiderSuggestions } from '@/services/admin';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

type Act = 'cancel' | 'fail' | 'requeue' | 'unassign';

/** Delivery detail (web /admin/deliveries/[id]): assign / reassign a rider, cancel, fail, requeue. */
export default function AdminDeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getLogisticsDelivery(id).then((r) => r.delivery), [id]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [act, setAct] = useState<Act | null>(null);
  const [eta, setEta] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const suggestions = useAsync(() => getRiderSuggestions(id).then((r) => r.items ?? []), [id, assignOpen], { skip: !assignOpen });
  const d = q.data;
  const canDispatch = can(['logistics.dispatch', 'deliveries.edit', 'deliveries.*']);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.show(ok, 'success');
      setAssignOpen(false);
      setAct(null);
      q.reload();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
      q.reload();
    } finally {
      setBusy(null);
    }
  };

  const ACT_LABEL: Record<Act, string> = { cancel: 'Cancel delivery', fail: 'Mark as failed', requeue: 'Put back in the queue', unassign: 'Unassign rider' };

  return (
    <Screen title={d?.order_number || 'Delivery'} subtitle={d?.status_display} narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/deliveries">
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error || !d ? (
        <ErrorState message={q.error ?? 'Delivery not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={d.status} label={d.status_display} />
              {d.is_delayed ? <Badge label="Delayed" tone="danger" /> : null}
              {d.open_issues ? <Badge label={`${d.open_issues} open issues`} tone="danger" /> : null}
            </View>
            <InfoRow label="Type" value={d.delivery_type === 'freezer' ? 'Freezer' : 'Stock'} />
            <InfoRow label="Items" value={d.items_count} />
            {d.order_total != null ? <InfoRow label="Order total" value={formatMoney(d.order_total, d.currency)} /> : null}
            <InfoRow label="Created" value={formatDateTime(d.created_at)} />
            <InfoRow label="Expected" value={formatDateTime(d.expected_delivery_at)} />
            <InfoRow label="Delivered" value={formatDateTime(d.delivered_at)} last />
          </Card>

          <Card padding={14}>
            <Text variant="overline">Pickup</Text>
            <Text weight="semibold" color={colors.text} style={{ marginTop: 4 }}>
              {d.pickup?.name}
            </Text>
            <Text variant="secondary" size={13}>
              {d.pickup?.address}
            </Text>
            {d.pickup?.phone ? <Button label="Call pickup" icon="phone" size="sm" variant="outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${d.pickup.phone}`)} /> : null}
          </Card>
          <Card padding={14}>
            <Text variant="overline">Drop-off</Text>
            <Text weight="semibold" color={colors.text} style={{ marginTop: 4 }}>
              {d.dropoff?.contact_name || d.dropoff?.name}
            </Text>
            <Text variant="secondary" size={13}>
              {d.dropoff?.address}
            </Text>
            {d.dropoff?.phone ? <Button label="Call customer" icon="phone" size="sm" variant="outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${d.dropoff.phone}`)} /> : null}
          </Card>

          <Card padding={14}>
            <Text variant="overline">Rider</Text>
            {d.rider ? (
              <>
                <InfoRow label="Name" value={d.rider.name} icon="bike" />
                <InfoRow label="Vehicle" value={d.rider.vehicle_type} />
                <InfoRow label="Assigned" value={formatDateTime(d.assigned_at)} last />
                <Button label="Call rider" icon="phone" size="sm" variant="outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${d.rider?.phone}`)} />
              </>
            ) : (
              <Text variant="secondary" style={{ marginTop: 4 }}>
                No rider assigned yet.
              </Text>
            )}
          </Card>

          {d.timeline?.length ? (
            <Card style={{ gap: 4 }}>
              <Text variant="subtitle">Timeline</Text>
              {d.timeline.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? colors.brand : colors.borderStrong, marginTop: 4 }} />
                    {i < d.timeline!.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2 }} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text weight="medium" color={colors.text}>
                      {t.status_display}
                    </Text>
                    <Text variant="caption">
                      {formatDateTime(t.at)}
                      {t.actor?.name ? ` · ${t.actor.name}` : ''}
                    </Text>
                    {t.note ? <Text variant="caption">{t.note}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {canDispatch ? (
            <View style={{ gap: 10 }}>
              <Button label={d.rider ? 'Reassign rider' : 'Assign a rider'} icon="bike" variant="ink" full onPress={() => setAssignOpen(true)} />
              <Button label="Resend delivery code" variant="outline" full loading={busy === 'code'} onPress={() => run('code', () => deliveryAction(d.delivery_id, 'resend-code'), 'Code sent to the customer')} />
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {d.rider ? <Button label="Unassign" size="sm" variant="ghost" onPress={() => setAct('unassign')} /> : null}
                <Button label="Requeue" size="sm" variant="ghost" onPress={() => setAct('requeue')} />
                <Button label="Failed" size="sm" variant="ghost" onPress={() => setAct('fail')} />
                <Button label="Cancel" size="sm" variant="ghost" onPress={() => setAct('cancel')} />
              </View>
            </View>
          ) : null}

          <Sheet visible={assignOpen} onClose={() => setAssignOpen(false)} title={d.rider ? 'Reassign rider' : 'Assign a rider'} subtitle="Nearest available riders first">
            <Input label="ETA in minutes (optional)" value={eta} onChangeText={(t) => setEta(t.replace(/\D/g, ''))} keyboardType="number-pad" />
            {suggestions.loading ? (
              <ListSkeleton rows={3} height={60} />
            ) : (suggestions.data ?? []).length === 0 ? (
              <EmptyState compact illustration="no-results" title="No riders available" description="Add riders or check their availability." />
            ) : (
              (suggestions.data ?? []).map((r) => {
                const riderId = String(r.rider_id ?? r.id);
                return (
                  <Pressable
                    key={riderId}
                    disabled={Boolean(busy)}
                    onPress={() =>
                      run(
                        `assign-${riderId}`,
                        () =>
                          d.rider
                            ? deliveryAction(d.delivery_id, 'reassign', { rider_id: riderId, reason: 'Reassigned from mobile admin', eta_minutes: eta ? Number(eta) : undefined })
                            : deliveryAction(d.delivery_id, 'assign', { rider_id: riderId, eta_minutes: eta ? Number(eta) : undefined }),
                        'Rider assigned',
                      )
                    }
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.brandSoft : colors.surface })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold" color={colors.text}>
                        {r.name}
                      </Text>
                      <Text variant="caption">
                        {r.distance_km != null ? `${Number(r.distance_km).toFixed(1)} km away · ` : ''}
                        {r.active_deliveries ?? 0} active
                      </Text>
                    </View>
                    {r.is_available === false ? <Badge label="Busy" tone="warning" /> : <Badge label="Available" tone="success" />}
                  </Pressable>
                );
              })
            )}
          </Sheet>

          <PromptSheet
            visible={Boolean(act)}
            onClose={() => setAct(null)}
            title={act ? `${ACT_LABEL[act]}?` : ''}
            minLength={3}
            destructive={act === 'cancel' || act === 'fail'}
            confirmLabel={act ? ACT_LABEL[act] : 'Confirm'}
            onConfirm={(reason) => (act ? run(act, () => deliveryAction(d.delivery_id, act, { reason }), 'Done') : undefined)}
          />
        </>
      )}
    </Screen>
  );
}
