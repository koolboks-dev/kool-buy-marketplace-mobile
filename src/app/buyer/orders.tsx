import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { payForOrder } from '@/components/OrderActions';
import { AppHeader, Avatar, Button, Card, EmptyState, ErrorState, FilterTabs, ListSkeleton, Loader, StatusBadge, Text, useToast } from '@/components/ui';
import { usePaged } from '@/hooks/useAsync';
import { formatDate, formatMoney } from '@/lib/format';
import { displayOrderStatus, isAwaitingPayment } from '@/lib/status';
import { listBuyerOrders } from '@/services/buyer';
import type { BuyerOrder } from '@/services/types';
import { putMany } from '@/store/cache';
import { useSession } from '@/store/session';
import { useLayout, useTheme } from '@/theme';

type Filter = 'all' | 'active' | 'unpaid' | 'completed' | 'cancelled';

const matches = (o: BuyerOrder, f: Filter) => {
  const st = displayOrderStatus(o);
  if (f === 'all') return true;
  if (f === 'unpaid') return isAwaitingPayment(o);
  if (f === 'completed') return st === 'delivered' || st === 'completed';
  if (f === 'cancelled') return ['cancelled', 'expired', 'rejected'].includes(st);
  return !['delivered', 'completed', 'cancelled', 'expired', 'rejected'].includes(st);
};

/** My Orders (web /buyer/orders). */
export default function BuyerOrders() {
  const { colors } = useTheme();
  const { gutter, contentWidth } = useLayout();
  const { user } = useSession();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const list = usePaged<BuyerOrder>(async (page) => {
    const r = await listBuyerOrders(page, 20);
    putMany('buyer-order', r.items ?? []);
    return { items: r.items ?? [], hasNext: Boolean(r.pagination?.has_next), total: r.pagination?.total };
  }, []);

  const shown = useMemo(() => list.items.filter((o) => matches(o, filter)), [list.items, filter]);
  const count = (f: Filter) => list.items.filter((o) => matches(o, f)).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="My Orders" subtitle={list.total != null ? `${list.total} orders` : undefined} backFallback="/(tabs)/account" />
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: gutter, gap: 12, paddingBottom: 40, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <FilterTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: 'all', label: 'All', count: list.items.length },
              { value: 'active', label: 'Active', count: count('active') },
              { value: 'unpaid', label: 'Unpaid', count: count('unpaid') },
              { value: 'completed', label: 'Completed', count: count('completed') },
              { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
            ]}
          />
        }
        ListEmptyComponent={
          list.loading ? (
            <ListSkeleton rows={4} height={120} />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.refresh} />
          ) : (
            <EmptyState illustration="no-orders-yet" title={filter === 'all' ? 'No orders yet' : 'Nothing here'} description="Orders you place on the marketplace show up here." action="Start shopping" onAction={() => router.push('/(tabs)/browse')} />
          )
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item: o }) => (
          <Card onPress={() => router.push({ pathname: '/buyer/order/[id]', params: { id: o.id } })} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar uri={o.vendor?.logo_url} name={o.vendor?.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text weight="semibold" color={colors.text} numberOfLines={1}>
                  {o.vendor?.name ?? 'Store'}
                </Text>
                <Text variant="caption">
                  {o.order_number} · {formatDate(o.timestamps?.created_at)}
                </Text>
              </View>
              <StatusBadge status={displayOrderStatus(o)} kind="order" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="secondary" size={13}>
                {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? '' : 's'} · {o.reservation_type === 'pickup' ? 'Pickup' : 'Delivery'}
              </Text>
              <Text variant="price">{formatMoney(o.grand_total ?? o.total_amount, o.market)}</Text>
            </View>
            {isAwaitingPayment(o) ? (
              <Button label="Pay now" variant="primary" size="sm" icon="card" onPress={() => payForOrder(o, user?.email, (m) => toast.show(m, 'error'))} />
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}
