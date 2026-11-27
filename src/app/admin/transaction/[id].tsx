import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, ErrorState, InfoRow, ListSkeleton, Screen, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { getAdminTransaction, reverifyTransaction } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** Transaction detail (web /admin/transactions/[id]): events, refunds, re-verify with Paystack. */
export default function AdminTransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getAdminTransaction(id), [id]);
  const [busy, setBusy] = useState(false);
  const t = q.data;

  return (
    <Screen title={t?.reference || 'Transaction'} subtitle={t ? titleCase(t.purpose) : undefined} narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/transactions">
      {q.loading ? (
        <ListSkeleton rows={3} />
      ) : q.error || !t ? (
        <ErrorState message={q.error ?? 'Not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="price" size={26}>
                {formatMoney(t.amount, t.currency)}
              </Text>
              <StatusBadge status={t.status} />
            </View>
            <InfoRow label="Fees" value={formatMoney(t.fees, t.currency)} />
            <InfoRow label="Refunded" value={formatMoney(t.refunded_amount, t.currency)} />
            <InfoRow label="Source" value={titleCase(t.source || '—')} />
            <InfoRow label="Channel" value={titleCase(t.channel || '—')} />
            <InfoRow label="Created" value={formatDateTime(t.created_at)} />
            <InfoRow label="Paid" value={formatDateTime(t.paid_at)} last />
          </Card>
          <Card padding={14}>
            <InfoRow label="Buyer" value={t.buyer?.name} />
            <InfoRow label="Buyer email" value={t.buyer?.email} />
            <InfoRow label="Order" value={t.order?.order_number} last />
            {t.order?.id ? <Button label="Open order" size="sm" variant="outline" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: t.order!.id } })} /> : null}
          </Card>
          {t.events.length ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">Events</Text>
              {t.events.map((e, i) => (
                <View key={String(e.id ?? i)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="medium" color={colors.text}>
                      {titleCase(String(e.event_type ?? 'event'))}
                    </Text>
                    <Text variant="caption">{formatDateTime(e.created_at)}</Text>
                  </View>
                  <StatusBadge status={e.status} />
                </View>
              ))}
            </Card>
          ) : null}
          {t.refunds.length ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">Refunds</Text>
              {t.refunds.map((r, i) => (
                <View key={String(r.id ?? i)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text>{formatMoney(r.amount, t.currency)}</Text>
                  <StatusBadge status={r.status} />
                </View>
              ))}
            </Card>
          ) : null}
          {can(['transactions.edit', 'transactions.*', 'transactions.reconcile']) && t.status !== 'paid' ? (
            <Button
              label="Re-verify with Paystack"
              icon="refresh"
              variant="ink"
              full
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await reverifyTransaction(t.id);
                  toast.show('Re-verified', 'success');
                  q.reload();
                } catch (err) {
                  toast.show(errorMessage(err), 'error');
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
