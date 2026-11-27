import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Card, StatusBadge, Text } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { listAdminOrders, type AdminOrderSummary } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'all' | 'pending_payment' | 'new' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

/** Orders (web /admin/orders). */
export default function AdminOrders() {
  const { colors } = useTheme();
  const { user } = useSession();
  return (
    <AdminList<AdminOrderSummary, Tab>
      title="Orders"
      subtitle="Monitor all platform orders"
      searchPlaceholder="Order number, buyer or seller"
      tabs={[
        { value: 'all', label: 'All' },
        { value: 'pending_payment', label: 'Awaiting payment' },
        { value: 'new', label: 'New' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'in_transit', label: 'In transit' },
        { value: 'delivered', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ]}
      keyOf={(o) => o.id}
      illustration="no-orders-yet"
      empty={{ title: 'No orders found' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listAdminOrders({ page, q: q || undefined, status: tab === 'all' ? undefined : tab });
        return { items: r.items ?? [], ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
      }}
      renderItem={(o) => (
        <Card onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: o.id } })} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text weight="semibold" color={colors.text}>
              {o.order_number}
            </Text>
            <StatusBadge status={o.status} kind="order" />
          </View>
          <Text variant="caption" numberOfLines={1}>
            {o.buyer_name} → {o.seller_name}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption">{formatDate(o.created_at)}</Text>
            <Text variant="price" size={15}>
              {formatMoney(o.total_amount, user?.market)}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
