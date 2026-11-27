import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppHeader, Badge, Card, EmptyState, ErrorState, FilterTabs, ListSkeleton, Loader, SearchBar, StatusBadge, Text } from '@/components/ui';
import { usePaged } from '@/hooks/useAsync';
import { formatDate, formatMoney } from '@/lib/format';
import { listSellerOrders } from '@/services/seller';
import type { SellerOrder } from '@/services/types';
import { putMany } from '@/store/cache';
import { useSession } from '@/store/session';
import { useLayout, useTheme } from '@/theme';

type Filter = 'all' | 'new' | 'progress' | 'completed' | 'cancelled';

const bucket = (o: SellerOrder): Filter => {
  const s = o.status.toLowerCase();
  if (['new', 'pending_payment', 'awaiting_confirmation'].includes(s)) return 'new';
  if (['delivered', 'completed'].includes(s)) return 'completed';
  if (['cancelled', 'rejected', 'expired'].includes(s)) return 'cancelled';
  return 'progress';
};

/** Orders / Wholesale Orders (web /retailer/orders, /wholesaler/orders). */
export default function SellerOrders() {
  const { colors } = useTheme();
  const { gutter, contentWidth } = useLayout();
  const { user, isWholesaler } = useSession();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const list = usePaged<SellerOrder>(async (page) => {
    const r = await listSellerOrders(page, 20);
    putMany('seller-order', r.orders ?? []);
    return { items: r.orders ?? [], hasNext: Boolean(r.pagination?.has_next), total: r.pagination?.total };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.items.filter((o) => (filter === 'all' || bucket(o) === filter) && (!q || o.order_number.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q)));
  }, [list.items, filter, query]);
  const count = (f: Filter) => list.items.filter((o) => bucket(o) === f).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={isWholesaler ? 'Wholesale Orders' : 'Orders'} subtitle={list.total != null ? `${list.total} orders` : undefined} backFallback="/seller" />
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: gutter, gap: 10, paddingBottom: 40, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        onEndReached={list.loadMore}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Order number or customer" />
            <FilterTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: 'All', count: list.items.length },
                { value: 'new', label: 'New', count: count('new') },
                { value: 'progress', label: 'In progress', count: count('progress') },
                { value: 'completed', label: 'Completed', count: count('completed') },
                { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          list.loading ? <ListSkeleton rows={5} height={100} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : <EmptyState illustration="no-orders-yet" title="No orders here" description="New orders from buyers will show up here." />
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item: o }) => (
          <Card onPress={() => router.push({ pathname: '/seller/order/[id]', params: { id: o.id } })} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text weight="semibold" color={colors.text}>
                  {o.order_number}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {o.customer_name} · {formatDate(o.created_at)}
                </Text>
              </View>
              <StatusBadge status={o.status} kind="order" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                <Badge label={o.reservation_type === 'pickup' ? 'Pickup' : 'Delivery'} icon={o.reservation_type === 'pickup' ? 'store' : 'truck'} />
                {o.payment_status ? <StatusBadge status={o.payment_status} /> : null}
                {o.on_hold ? <Badge label="On hold" tone="warning" /> : null}
              </View>
              <Text variant="price">{formatMoney(o.grand_total ?? o.subtotal, user?.market)}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
