import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Avatar, Badge, Card, StatusBadge, Text } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { listAdminUsers, type AdminUserSummary } from '@/services/admin';
import { useTheme } from '@/theme';

type Tab = 'all' | 'individual' | 'retailer' | 'wholesaler' | 'inactive';

/** Users (web /admin/users). */
export default function AdminUsers() {
  const { colors } = useTheme();
  return (
    <AdminList<AdminUserSummary, Tab>
      title="Users"
      subtitle="Manage all registered users"
      searchPlaceholder="Name, email or phone"
      tabs={[
        { value: 'all', label: 'All' },
        { value: 'individual', label: 'Individuals' },
        { value: 'retailer', label: 'Retailers' },
        { value: 'wholesaler', label: 'Wholesalers' },
        { value: 'inactive', label: 'Inactive' },
      ]}
      keyOf={(u) => u.id}
      empty={{ title: 'No users found' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listAdminUsers({ page, q: q || undefined, role: tab === 'all' || tab === 'inactive' ? undefined : tab, is_active: tab === 'inactive' ? false : undefined });
        return { items: r.items ?? [], ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
      }}
      renderItem={(u) => (
        <Card onPress={() => router.push({ pathname: '/admin/user/[id]', params: { id: u.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={u.name || u.email} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="semibold" color={colors.text} numberOfLines={1}>
              {u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {u.email || u.phone_number}
            </Text>
            <Text variant="caption">Joined {formatDate(u.date_joined)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusBadge status={u.is_staff ? 'admin' : u.role} />
            {!u.is_active ? <Badge label="Inactive" tone="danger" /> : null}
          </View>
        </Card>
      )}
    />
  );
}
