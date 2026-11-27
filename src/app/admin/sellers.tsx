import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Avatar, Badge, Card, StatusBadge, Text } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { listAdminSellers, type AdminSellerSummary } from '@/services/admin';
import { useTheme } from '@/theme';

type Tab = 'all' | 'retailer' | 'wholesaler' | 'unverified' | 'suspended';

/** Sellers Management (web /admin/sellers): All / Retailers / Wholesalers / Suspended. */
export default function AdminSellers() {
  const { colors } = useTheme();
  return (
    <AdminList<AdminSellerSummary, Tab>
      title="Sellers Management"
      subtitle="Manage stores and sellers"
      searchPlaceholder="Store name, email or phone"
      tabs={[
        { value: 'all', label: 'All', countKey: 'all' },
        { value: 'retailer', label: 'Retailers', countKey: 'retailer' },
        { value: 'wholesaler', label: 'Wholesalers', countKey: 'wholesaler' },
        { value: 'unverified', label: 'Unverified' },
        { value: 'suspended', label: 'Suspended', countKey: 'suspended' },
      ]}
      keyOf={(s) => s.id}
      illustration="no-vendors"
      empty={{ title: 'No sellers found' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listAdminSellers({
          page,
          q: q || undefined,
          role: tab === 'retailer' || tab === 'wholesaler' ? tab : undefined,
          is_verified: tab === 'unverified' ? false : undefined,
          status: tab === 'suspended' ? 'suspended' : undefined,
        });
        return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
      }}
      renderItem={(s) => (
        <Card onPress={() => router.push({ pathname: '/admin/seller/[id]', params: { id: s.id } })} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={s.business_name} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="semibold" color={colors.text} numberOfLines={1}>
                {s.business_name}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {s.email || s.phone}
              </Text>
            </View>
            <StatusBadge status={s.is_verified} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {s.role ? <StatusBadge status={s.role} /> : null}
            {s.suspended_at ? <Badge label="Suspended" tone="danger" /> : !s.is_active ? <Badge label="Inactive" tone="danger" /> : null}
            <Badge label={`${s.product_count} products`} />
            <Badge label={`${s.order_count} orders`} />
            <Badge label={`Since ${formatDate(s.created_at)}`} />
          </View>
        </Card>
      )}
    />
  );
}
