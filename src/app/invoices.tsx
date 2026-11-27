import { View } from 'react-native';

import { Card, EmptyState, ErrorState, InfoRow, ListSkeleton, Screen, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatMoney } from '@/lib/format';
import { listFinancingInvoices } from '@/services/buyer';
import { useTheme } from '@/theme';

/** Invoices (web /invoices): issued once vendors confirm what they can supply. */
export default function InvoicesScreen() {
  const { colors } = useTheme();
  const q = useAsync(() => listFinancingInvoices(1, 50).then((r) => r.items ?? r.results ?? []), []);
  const items = q.data ?? [];
  return (
    <Screen title="Invoices" subtitle="Issued once your vendors confirm what they can supply" refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : items.length === 0 ? (
        <EmptyState illustration="no-orders-yet" title="No invoices yet" description="Invoices appear here once vendors confirm your order." />
      ) : (
        items.map((inv) => {
          const i = inv as Record<string, any>;
          return (
            <Card key={String(i.id)} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold" color={colors.text}>
                  {i.invoice_number ?? i.number ?? i.reference ?? 'Invoice'}
                </Text>
                <StatusBadge status={i.status} />
              </View>
              <InfoRow label="Amount" value={formatMoney(i.total ?? i.amount ?? i.total_amount, i.currency)} />
              {i.balance != null || i.outstanding != null ? <InfoRow label="Outstanding" value={formatMoney(i.balance ?? i.outstanding, i.currency)} /> : null}
              <InfoRow label="Issued" value={formatDate(i.issued_at ?? i.created_at)} />
              <InfoRow label="Due" value={formatDate(i.due_date ?? i.due_at)} last />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
