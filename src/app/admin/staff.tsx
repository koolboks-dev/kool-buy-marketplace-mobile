import { View } from 'react-native';

import { AdminList } from '@/components/admin/AdminList';
import { Avatar, Badge, Card, StatusBadge, Switch, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { listStaff, updateStaff } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Member = Awaited<ReturnType<typeof listStaff>>['items'][number];

/** Staff (web /admin/staff): accounts and the role each one holds. */
export default function AdminStaff() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can, user } = useSession();
  const canEdit = can(['staff.edit', 'staff.*']);
  return (
    <AdminList<Member, 'all'>
      title="Staff"
      subtitle="Staff accounts and the role each one holds"
      searchPlaceholder="Name or email"
      keyOf={(m) => m.id}
      empty={{ title: 'No staff found' }}
      fetchPage={async ({ q }) => {
        const r = await listStaff(q || undefined);
        return { items: r.items ?? [], hasNext: false, total: r.items?.length };
      }}
      renderItem={(m, { update }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={m.name || m.email} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text weight="semibold" color={colors.text} numberOfLines={1}>
              {m.name || m.email}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {m.email}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {m.is_super_admin ? <Badge label="Super Admin" tone="brand" /> : <Badge label={m.role?.name ?? 'No role'} />}
              <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
              {m.last_login ? <Badge label={`Seen ${timeAgo(m.last_login)}`} /> : null}
            </View>
          </View>
          {canEdit && m.id !== user?.id && !m.is_super_admin ? (
            <Switch
              value={m.is_active}
              onValueChange={async (v) => {
                update((items) => items.map((x) => (x.id === m.id ? { ...x, is_active: v } : x)));
                try {
                  await updateStaff(m.id, { is_active: v });
                } catch (err) {
                  update((items) => items.map((x) => (x.id === m.id ? { ...x, is_active: !v } : x)));
                  toast.show(errorMessage(err), 'error');
                }
              }}
            />
          ) : null}
        </Card>
      )}
    />
  );
}
