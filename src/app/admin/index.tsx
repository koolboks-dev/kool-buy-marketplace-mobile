import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AreaChart,
  Avatar,
  Button,
  Card,
  ChartCard,
  Donut,
  EmptyState,
  ErrorState,
  Glyph,
  IconButton,
  KpiTile,
  ListSkeleton,
  Screen,
  Segmented,
  StatusBadge,
  Text,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatCompactMoney, formatDate, formatMoney, formatNumber, titleCase } from '@/lib/format';
import { ADMIN_MENU, groupBySection, hasStaffPermission } from '@/lib/nav';
import { statusConfig } from '@/lib/status';
import { getAdminAnalytics, getAdminOverviewStats } from '@/services/admin';
import { useSession } from '@/store/session';
import { radius, SERIES, useLayout, useTheme } from '@/theme';

type Period = '7d' | '30d' | '90d';
type Measure = 'gmv' | 'orders';

const ROLE_LABEL: Record<string, string> = { individual: 'Individuals', retailer: 'Retailers', wholesaler: 'Wholesalers', crm_agent: 'CRM agents', admin: 'Admins' };

function statusColor(status: string): string {
  const tone = statusConfig(status).tone;
  return tone === 'success' ? SERIES[2] : tone === 'warning' ? SERIES[3] : tone === 'danger' ? SERIES[7] : tone === 'brand' ? SERIES[1] : SERIES[4];
}

/** Admin Overview (web /admin/dashboard → AdminPlatformDashboard). */
export default function AdminOverview() {
  const { colors } = useTheme();
  const { isTablet, columns } = useLayout();
  const { user, permissions, can } = useSession();
  const [period, setPeriod] = useState<Period>('30d');
  const [measure, setMeasure] = useState<Measure>('gmv');
  const market = user?.market || 'NG';
  const canDashboard = can(['dashboard_admin.view']) || Boolean(user?.staff?.is_super_admin) || permissions == null;

  const analytics = useAsync(() => getAdminAnalytics(period, market), [period, market], { skip: !canDashboard });
  const overview = useAsync(() => getAdminOverviewStats(), [], { skip: !canDashboard });
  const a = analytics.data;
  const o = overview.data;
  const series = a?.series ?? [];
  const k = a?.kpis;
  const sectionCols = Math.max(2, columns(170));

  const shortcuts = ADMIN_MENU.filter((i) => i.href !== '/admin' && hasStaffPermission(permissions, i.permission));

  return (
    <Screen
      title="Overview"
      subtitle="Platform analytics and statistics"
      backFallback="/(tabs)/account"
      refreshing={analytics.refreshing || overview.refreshing}
      onRefresh={() => {
        analytics.refresh();
        overview.refresh();
      }}
      headerRight={
        <>
          <IconButton icon="bell" label="Notifications" size={38} onPress={() => router.push('/notifications')} />
          <IconButton icon="menu" label="All admin sections" size={38} onPress={() => router.push('/admin/menu')} />
        </>
      }
    >
      {!canDashboard ? (
        <Card>
          <EmptyState compact illustration="no-results" title="No dashboard assigned yet" description="Your role doesn't have a dashboard. Use the sections below, or ask a Super Admin to add one under Roles & Permission." />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text variant="caption">{a ? `${formatDate(a.from)} – ${formatDate(a.to)} · ${a.currency}` : ' '}</Text>
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
              ]}
            />
          </View>

          {analytics.loading ? (
            <ListSkeleton rows={3} height={110} />
          ) : analytics.error ? (
            <ErrorState message={analytics.error} onRetry={analytics.refresh} />
          ) : k ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <KpiTile label="GMV (paid)" icon="money" value={formatCompactMoney(k.gmv.value, a?.currency)} current={k.gmv.value} previous={k.gmv.previous} hint="vs previous period" spark={series.map((d) => d.gmv)} />
              <KpiTile label="Orders" icon="receipt" value={formatNumber(k.orders.value)} current={k.orders.value} previous={k.orders.previous} spark={series.map((d) => d.orders)} onPress={() => router.push('/admin/orders')} />
              <KpiTile label="Avg order value" icon="tag" value={formatCompactMoney(k.avg_order_value.value, a?.currency)} current={k.avg_order_value.value} previous={k.avg_order_value.previous} />
              <KpiTile label="New users" icon="users" value={formatNumber(k.new_users.value)} current={k.new_users.value} previous={k.new_users.previous} spark={series.map((d) => d.new_users)} onPress={() => router.push('/admin/users')} />
              <KpiTile label="New sellers" icon="store" value={formatNumber(k.new_sellers.value)} current={k.new_sellers.value} previous={k.new_sellers.previous} spark={series.map((d) => d.new_sellers)} onPress={() => router.push('/admin/sellers')} />
              <KpiTile label="Active buyers" icon="user" value={formatNumber(k.active_buyers.value)} current={k.active_buyers.value} previous={k.active_buyers.previous} />
            </View>
          ) : null}

          {a ? (
            <ChartCard
              title={measure === 'gmv' ? 'GMV trend' : 'Orders trend'}
              subtitle="Daily, paid orders"
              right={
                <Segmented<Measure>
                  value={measure}
                  onChange={setMeasure}
                  options={[
                    { value: 'gmv', label: 'GMV' },
                    { value: 'orders', label: 'Orders' },
                  ]}
                />
              }
            >
              <AreaChart data={series.map((d) => (measure === 'gmv' ? d.gmv : d.orders))} labels={series.map((d) => d.date.slice(5))} />
            </ChartCard>
          ) : null}

          {a ? (
            <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ChartCard title="Orders by status">
                  {a.orders_by_status.length ? (
                    <Donut data={a.orders_by_status.map((s) => ({ label: statusConfig(s.status, 'order').label, value: s.count, color: statusColor(s.status) }))} centerLabel="orders" />
                  ) : (
                    <Text variant="caption">No orders in this period.</Text>
                  )}
                </ChartCard>
              </View>
              <View style={{ flex: 1 }}>
                <ChartCard title="Users by role">
                  <Donut data={a.users_by_role.map((r) => ({ label: ROLE_LABEL[r.role] ?? titleCase(r.role), value: r.count }))} centerLabel="users" />
                </ChartCard>
              </View>
            </View>
          ) : null}

          {a?.sellers_by_type?.length ? (
            <ChartCard title="Sellers by type" subtitle="Verified vs unverified">
              {a.sellers_by_type.map((s) => {
                const total = s.verified + s.unverified || 1;
                return (
                  <View key={s.type} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text weight="medium" color={colors.text}>
                        {titleCase(s.type)}s
                      </Text>
                      <Text variant="caption">
                        {s.verified} verified · {s.unverified} unverified
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.mutedStrong }}>
                      <View style={{ width: `${(s.verified / total) * 100}%`, backgroundColor: SERIES[2] }} />
                      <View style={{ width: `${(s.unverified / total) * 100}%`, backgroundColor: SERIES[3] }} />
                    </View>
                  </View>
                );
              })}
            </ChartCard>
          ) : null}

          {a?.top_sellers?.length ? (
            <Card padding={0}>
              <Text variant="subtitle" style={{ padding: 14, paddingBottom: 6 }}>
                Top sellers
              </Text>
              {a.top_sellers.slice(0, 5).map((s, i) => (
                <Pressable key={s.id} onPress={() => router.push({ pathname: '/admin/seller/[id]', params: { id: s.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text weight="bold" color={colors.textMuted} style={{ width: 18 }}>
                    {i + 1}
                  </Text>
                  <Avatar name={s.name} size={30} />
                  <Text weight="medium" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text weight="semibold" color={colors.text}>
                      {formatCompactMoney(s.revenue, a.currency)}
                    </Text>
                    <Text variant="caption">{s.orders} orders</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {o ? (
            <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
              <Card padding={0} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 6 }}>
                  <Text variant="subtitle">Recent orders</Text>
                  <Button label="All" size="sm" variant="ghost" onPress={() => router.push('/admin/orders')} />
                </View>
                {o.recent_orders.slice(0, 6).map((r) => (
                  <Pressable key={r.id} onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: r.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text weight="medium" color={colors.text}>
                        {r.order_number}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {r.buyer_name} → {r.seller_name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <StatusBadge status={r.status} kind="order" />
                      <Text variant="caption">{formatMoney(r.total_amount, market)}</Text>
                    </View>
                  </Pressable>
                ))}
              </Card>
              <Card padding={0} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 6 }}>
                  <Text variant="subtitle">New users</Text>
                  <Button label="All" size="sm" variant="ghost" onPress={() => router.push('/admin/users')} />
                </View>
                {o.recent_users.slice(0, 6).map((u) => (
                  <Pressable key={u.id} onPress={() => router.push({ pathname: '/admin/user/[id]', params: { id: u.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Avatar name={u.name || u.email} size={30} />
                    <View style={{ flex: 1 }}>
                      <Text weight="medium" color={colors.text} numberOfLines={1}>
                        {u.name || u.email}
                      </Text>
                      <Text variant="caption">{formatDate(u.date_joined)}</Text>
                    </View>
                    <StatusBadge status={u.role} />
                  </Pressable>
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}

      {groupBySection(shortcuts).map((g) => (
        <View key={g.section ?? 'main'} style={{ gap: 8 }}>
          <Text variant="overline">{g.section}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {g.items.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as never)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexBasis: `${100 / sectionCols - 3}%`,
                  flexGrow: 1,
                  minWidth: 140,
                  padding: 12,
                  gap: 8,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: pressed ? colors.borderStrong : colors.border,
                  backgroundColor: pressed ? colors.brandSoft : colors.surface,
                })}
              >
                <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name={item.icon} size={17} color={colors.text} />
                </View>
                <Text weight="semibold" size={13} color={colors.text} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
