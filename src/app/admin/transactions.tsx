import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Card, StatTile, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatCompactMoney, formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { getTransactionsSummary, listAdminTransactions, type AdminTransaction } from '@/services/admin';
import { useTheme } from '@/theme';

type Tab = 'all' | 'paid' | 'pending' | 'failed' | 'refunded';

/** Transactions (web /admin/transactions): ledger + reconciliation. */
export default function AdminTransactions() {
  const { colors } = useTheme();
  const summary = useAsync(() => getTransactionsSummary().catch(() => null), []);
  const cur = (summary.data?.by_currency ?? [])[0] as Record<string, any> | undefined;

  return (
    <AdminList<AdminTransaction, Tab>
      title="Transactions"
      subtitle="Payments, reconciliation and the ledger"
      searchPlaceholder="Reference, order or buyer"
      tabs={[
        { value: 'all', label: 'All' },
        { value: 'paid', label: 'Paid' },
        { value: 'pending', label: 'Pending' },
        { value: 'failed', label: 'Failed' },
        { value: 'refunded', label: 'Refunded' },
      ]}
      keyOf={(t) => t.id}
      above={
        cur ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatTile label="Paid volume" value={formatCompactMoney(cur.paid_volume ?? cur.paid ?? 0, cur.currency)} icon="money" />
            <StatTile label="Transactions" value={String(cur.total_count ?? cur.count ?? '—')} icon="card" />
          </View>
        ) : null
      }
      empty={{ title: 'No transactions found' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listAdminTransactions({ page, search: q || undefined, status: tab === 'all' ? undefined : tab });
        return { items: r.items, ...pageInfo(r.pagination, page, r.items.length) };
      }}
      renderItem={(t) => (
        <Card onPress={() => router.push({ pathname: '/admin/transaction/[id]', params: { id: t.id } })} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text weight="semibold" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
              {t.order?.order_number || titleCase(t.purpose)}
            </Text>
            <StatusBadge status={t.status} />
          </View>
          <Text variant="caption" numberOfLines={1}>
            {t.buyer?.name || t.buyer?.email || '—'} · {titleCase(t.source || 'paystack')}
            {t.channel ? ` · ${titleCase(t.channel)}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption">{formatDateTime(t.paid_at || t.created_at)}</Text>
            <Text variant="price" size={15}>
              {formatMoney(t.amount, t.currency)}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
