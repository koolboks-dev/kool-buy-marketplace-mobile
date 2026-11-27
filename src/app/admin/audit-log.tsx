import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Badge, Card, Text } from '@/components/ui';
import { formatDateTime, titleCase } from '@/lib/format';
import { listAuditLog } from '@/services/admin';
import { useTheme } from '@/theme';

type Entry = NonNullable<Awaited<ReturnType<typeof listAuditLog>>['items']>[number];
type Tab = 'all' | 'approvals' | 'pricing' | 'permissions' | 'finance';

/** Audit Log (web /admin/audit-log): who changed what. */
export default function AdminAuditLog() {
  const { colors } = useTheme();
  return (
    <AdminList<Entry, Tab>
      title="Audit Log"
      subtitle="Approvals, prices, permissions and financial adjustments"
      searchPlaceholder="Person, record or action"
      tabs={[
        { value: 'all', label: 'All' },
        { value: 'approvals', label: 'Approvals' },
        { value: 'pricing', label: 'Pricing' },
        { value: 'permissions', label: 'Permissions' },
        { value: 'finance', label: 'Finance' },
      ]}
      keyOf={(e) => e.id}
      empty={{ title: 'No entries' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listAuditLog({ page, q: q || undefined, category: tab === 'all' ? undefined : tab });
        const items = r.items ?? [];
        return { items, ...pageInfo({ total: r.pagination?.total, page_size: 25 }, page, items.length, 25) };
      }}
      renderItem={(e) => (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text weight="semibold" color={colors.text} style={{ flex: 1 }}>
              {e.summary || titleCase(e.action)}
            </Text>
            <Badge label={titleCase(e.category)} />
          </View>
          <Text variant="caption">
            {e.actor?.label ?? 'System'} · {formatDateTime(e.created_at)}
          </Text>
          {e.entity_label ? (
            <Text size={13}>
              {titleCase(e.entity_type)}: {e.entity_label}
            </Text>
          ) : null}
          {e.changes && Object.keys(e.changes).length ? (
            <View style={{ gap: 2 }}>
              {Object.entries(e.changes)
                .slice(0, 6)
                .map(([k, v]) => (
                  <Text key={k} variant="caption" numberOfLines={2}>
                    {titleCase(k)}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </Text>
                ))}
            </View>
          ) : null}
        </Card>
      )}
    />
  );
}
