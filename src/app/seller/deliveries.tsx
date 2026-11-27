import { Linking, View } from 'react-native';
import { useState } from 'react';

import { Badge, Button, Card, EmptyState, ErrorState, FilterTabs, InfoRow, ListSkeleton, Screen, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime } from '@/lib/format';
import { listMyDeliveries, listSellerDeliveries } from '@/services/seller';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/**
 * Wholesalers: Logistics & Dispatch — Koolboks deliveries collecting from the store.
 * Retailers: My Deliveries — stock coming to them.
 */
export default function SellerDeliveries() {
  const { colors } = useTheme();
  const { isWholesaler } = useSession();
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');

  const outbound = useAsync(() => listSellerDeliveries(tab), [tab], { skip: !isWholesaler });
  const inbound = useAsync(() => listMyDeliveries(tab === 'active').then((r) => r.items ?? []), [tab], { skip: isWholesaler });
  const q = isWholesaler ? outbound : inbound;

  return (
    <Screen
      title={isWholesaler ? 'Logistics & Dispatch' : 'My Deliveries'}
      subtitle={isWholesaler ? 'Koolboks deliveries collecting from your store' : 'Track your packages and confirm what arrived'}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      backFallback="/seller"
    >
      <FilterTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Active', count: isWholesaler ? outbound.data?.counts?.active : undefined },
          { value: 'completed', label: 'Completed', count: isWholesaler ? outbound.data?.counts?.completed : undefined },
          { value: 'all', label: 'All', count: isWholesaler ? outbound.data?.counts?.all : undefined },
        ]}
      />
      {q.loading ? (
        <ListSkeleton rows={4} height={120} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : isWholesaler ? (
        (outbound.data?.items ?? []).length === 0 ? (
          <EmptyState illustration="cold-chain-delivery" title="No deliveries here" description="When Koolboks books a pickup from your store it shows here." />
        ) : (
          (outbound.data?.items ?? []).map((d) => (
            <Card key={d.delivery_id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold" color={colors.text}>
                  {d.order_number}
                </Text>
                <StatusBadge status={d.status} label={d.status_display} />
              </View>
              <Text variant="caption">
                To {d.retailer?.name} · {[d.retailer?.city, d.retailer?.state].filter(Boolean).join(', ')} · {d.items_count} items
              </Text>
              {d.rider ? (
                <>
                  <InfoRow label="Rider" value={`${d.rider.name} · ${d.rider.vehicle_type}`} icon="bike" />
                  <Button label="Call rider" icon="phone" size="sm" variant="outline" style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${d.rider?.phone}`)} />
                </>
              ) : (
                <Badge label="Waiting for a rider" tone="warning" />
              )}
              {d.pickup_instructions ? <Text variant="caption">Note: {d.pickup_instructions}</Text> : null}
              <InfoRow label="Created" value={formatDateTime(d.created_at)} last />
            </Card>
          ))
        )
      ) : (inbound.data ?? []).length === 0 ? (
        <EmptyState illustration="cold-chain-delivery" title="No deliveries here" description="Deliveries for your stock orders will show up here." />
      ) : (
        (inbound.data ?? []).map((d) => (
          <Card key={String(d.delivery_id ?? d.id)} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="semibold" color={colors.text}>
                {d.order_number ?? d.invoice_number ?? 'Delivery'}
              </Text>
              <StatusBadge status={d.status} label={d.status_display} />
            </View>
            {d.vendor?.name || d.pickup?.name ? <Text variant="caption">From {d.vendor?.name ?? d.pickup?.name}</Text> : null}
            {d.rider?.name ? <InfoRow label="Rider" value={d.rider.name} icon="bike" /> : null}
            {d.expected_delivery_at ? <InfoRow label="Expected" value={formatDateTime(d.expected_delivery_at)} /> : null}
            {d.delivery_code || d.code ? <InfoRow label="Delivery code" value={d.delivery_code ?? d.code} /> : null}
            <InfoRow label="Created" value={formatDateTime(d.created_at)} last />
          </Card>
        ))
      )}
    </Screen>
  );
}
