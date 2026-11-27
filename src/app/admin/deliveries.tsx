import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Badge, Card, Glyph, StatusBadge, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { listLogisticsDeliveries, type AdminDeliveryRow, type DeliveryGroup } from '@/services/admin';
import { useTheme } from '@/theme';

/** Deliveries (web /admin/deliveries): the dispatch board grouped by stage. */
export default function AdminDeliveries() {
  const { colors } = useTheme();
  return (
    <AdminList<AdminDeliveryRow, DeliveryGroup>
      title="Deliveries"
      subtitle="Dispatch board and rider assignment"
      searchPlaceholder="Order, invoice, customer or rider"
      tabs={[
        { value: 'unassigned', label: 'Unassigned', countKey: 'unassigned' },
        { value: 'active', label: 'Active', countKey: 'active' },
        { value: 'delayed', label: 'Delayed', countKey: 'delayed' },
        { value: 'exceptions', label: 'Exceptions', countKey: 'exceptions' },
        { value: 'completed', label: 'Completed', countKey: 'completed' },
        { value: 'all', label: 'All', countKey: 'all' },
      ]}
      keyOf={(d) => d.delivery_id}
      illustration="cold-chain-delivery"
      empty={{ title: 'No deliveries in this group' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listLogisticsDeliveries({ page, group: tab, search: q || undefined });
        return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
      }}
      renderItem={(d) => (
        <Card onPress={() => router.push({ pathname: '/admin/delivery/[id]', params: { id: d.delivery_id } })} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={colors.text}>
                {d.order_number || d.invoice_number || d.delivery_id.slice(0, 8)}
              </Text>
              <Text variant="caption">{d.delivery_type === 'freezer' ? 'Freezer delivery' : `${d.items_count} items`}</Text>
            </View>
            <StatusBadge status={d.status} label={d.status_display} />
          </View>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Glyph name="store" size={15} color={colors.textMuted} />
              <Text size={13} style={{ flex: 1 }} numberOfLines={1}>
                {d.pickup?.name || d.vendor} · {d.pickup?.address}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Glyph name="location" size={15} color={colors.textMuted} />
              <Text size={13} style={{ flex: 1 }} numberOfLines={1}>
                {d.dropoff?.name || d.customer} · {d.dropoff?.address}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {d.rider ? <Badge label={d.rider.name} icon="bike" /> : <Badge label="No rider yet" tone="warning" />}
            {d.is_delayed ? <Badge label="Delayed" tone="danger" /> : null}
            {d.open_issues ? <Badge label={`${d.open_issues} issue${d.open_issues > 1 ? 's' : ''}`} tone="danger" icon="warning" /> : null}
            {d.minutes_waiting ? <Badge label={`Waiting ${d.minutes_waiting}m`} /> : null}
            <Badge label={formatDateTime(d.created_at)} />
          </View>
        </Card>
      )}
    />
  );
}
