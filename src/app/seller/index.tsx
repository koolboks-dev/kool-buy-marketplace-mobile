import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { MenuSections } from '@/components/MenuSections';
import { BarChart, Button, Card, ChartCard, Donut, EmptyState, ErrorState, Glyph, IconButton, ListSkeleton, Screen, StatTile, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { WEB_BASE_URL } from '@/lib/config';
import { formatCompactMoney, formatDate, formatMoney } from '@/lib/format';
import { sellerMenu } from '@/lib/nav';
import { getSellerOverview, getWholesalerOverview, listSellerOrders } from '@/services/seller';
import { putMany } from '@/store/cache';
import { useSession } from '@/store/session';
import { useLayout, useTheme } from '@/theme';

/** Retailer / wholesaler Overview (web /retailer/dashboard, /wholesaler/dashboard). */
export default function SellerDashboard() {
  const { colors } = useTheme();
  const { isTablet } = useLayout();
  const { user, isWholesaler } = useSession();
  const market = user?.market;
  const overview = useAsync(() => (isWholesaler ? getWholesalerOverview() : getSellerOverview()), [isWholesaler]);
  const orders = useAsync(
    () =>
      listSellerOrders(1, 5).then((r) => {
        putMany('seller-order', r.orders ?? []);
        return r.orders ?? [];
      }),
    [],
  );

  const s = overview.data?.summary;
  const months = (overview.data?.revenue_by_month ?? []).slice(-6).map((m) => ({ label: m.name ?? m.month.slice(5), value: m.amount }));
  const breakdown = overview.data?.store_breakdown ?? overview.data?.allocation_breakdown;
  const onboardingStatus = user?.partner_onboarding?.status ?? user?.onboarding?.status;
  const onboardingDone = user?.partner_onboarding?.is_complete ?? user?.onboarding?.is_complete;

  return (
    <Screen
      title={isWholesaler ? 'Wholesale Hub' : 'Overview'}
      subtitle={user?.seller_profile?.business_name ?? (isWholesaler ? 'Bulk supply and distribution' : 'Your store')}
      backFallback="/(tabs)/account"
      refreshing={overview.refreshing}
      onRefresh={() => {
        overview.refresh();
        orders.reload();
      }}
      headerRight={<IconButton icon="bell" label="Notifications" size={38} onPress={() => router.push('/notifications')} />}
    >
      {onboardingDone === false ? (
        <Card muted style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Glyph name="clipboard" size={18} color={colors.brand} />
            <Text weight="semibold" color={colors.text} style={{ flex: 1 }}>
              Complete your partner onboarding
            </Text>
            {onboardingStatus ? <StatusBadge status={onboardingStatus} /> : null}
          </View>
          <Text variant="caption">Upload your documents so our team can verify your business and switch on ordering.</Text>
          <Button label="Continue onboarding" variant="outline" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`${WEB_BASE_URL}${isWholesaler ? '/wholesaler/onboarding' : '/onboarding'}`)} />
        </Card>
      ) : null}

      {overview.loading ? (
        <ListSkeleton rows={3} height={90} />
      ) : overview.error ? (
        <ErrorState message={overview.error} onRetry={overview.refresh} />
      ) : s ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatTile label={isWholesaler ? 'Wholesale revenue' : 'Total sales'} value={formatCompactMoney(s.total_revenue ?? s.total_sales, market)} icon="money" />
            <StatTile label={isWholesaler ? 'Active products' : 'Products'} value={s.active_products ?? s.total_products} icon="cube" />
            <StatTile label="Pending orders" value={s.pending_orders} icon="receipt" />
            {isWholesaler && s.cold_logistics ? (
              <StatTile label="Cold logistics" value={s.cold_logistics.label} icon="truck" />
            ) : (
              <StatTile label="Completed" value={s.completed_orders ?? s.fulfilled_orders ?? 0} icon="check-circle" />
            )}
          </View>

          <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ChartCard title="Revenue" subtitle="Last 6 months">
                {months.length ? <BarChart data={months} /> : <Text variant="caption">No sales yet.</Text>}
              </ChartCard>
            </View>
            {breakdown?.items?.length ? (
              <View style={{ flex: 1 }}>
                <ChartCard title={isWholesaler ? 'Allocation' : 'Store breakdown'} subtitle={`${breakdown.total_units} units`}>
                  <Donut data={breakdown.items.map((i) => ({ label: i.name, value: i.value, color: i.color }))} centerLabel="units" centerValue={String(breakdown.total_units)} />
                </ChartCard>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Card padding={0}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text variant="subtitle">Recent orders</Text>
          <Button label="View all" size="sm" variant="ghost" onPress={() => router.push('/seller/orders')} />
        </View>
        {(orders.data ?? []).length === 0 ? (
          <EmptyState compact illustration="no-orders-yet" title="No orders yet" description="New orders from buyers will show up here." />
        ) : (
          (orders.data ?? []).map((o, i, arr) => (
            <Pressable
              key={o.id}
              onPress={() => router.push({ pathname: '/seller/order/[id]', params: { id: o.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: colors.border }}
            >
              <View style={{ flex: 1 }}>
                <Text weight="semibold" color={colors.text}>
                  {o.order_number}
                </Text>
                <Text variant="caption">
                  {o.customer_name} · {formatDate(o.created_at)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={o.status} kind="order" />
                <Text weight="semibold" size={13} color={colors.text}>
                  {formatMoney(o.grand_total ?? o.subtotal, market)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <MenuSections items={sellerMenu(user?.role).filter((i) => i.href !== '/seller')} />
    </Screen>
  );
}
