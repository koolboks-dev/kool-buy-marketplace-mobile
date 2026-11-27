import { View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, InfoRow, ListSkeleton, Screen, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { createDedicatedAccount, getDedicatedAccount, listPaymentHistory } from '@/services/buyer';
import { useTheme } from '@/theme';

/** Payments (web /buyer/payments, /retailer/payments): history, refunds and the transfer account. */
export default function Payments() {
  const { colors } = useTheme();
  const toast = useToast();
  const history = useAsync(() => listPaymentHistory(1, 50).then((r) => r.items ?? []), []);
  const account = useAsync(() => getDedicatedAccount().catch(() => null), []);
  const acct = (account.data as Record<string, any> | null)?.account ?? account.data;
  const hasAccount = Boolean(acct && (acct.account_number || acct.accountNumber));

  return (
    <Screen
      title="Payments"
      subtitle="Your payments, refunds and transfer account"
      refreshing={history.refreshing}
      onRefresh={() => {
        history.refresh();
        account.reload();
      }}
    >
      <Card style={{ gap: 8 }}>
        <Text variant="subtitle">Bank transfer account</Text>
        {hasAccount ? (
          <>
            <InfoRow label="Bank" value={acct.bank_name ?? acct.bank?.name} />
            <InfoRow label="Account number" value={acct.account_number ?? acct.accountNumber} />
            <InfoRow label="Account name" value={acct.account_name ?? acct.accountName} last />
            <Text variant="caption">Transfers to this account are matched to your orders automatically.</Text>
          </>
        ) : (
          <>
            <Text variant="secondary" size={13}>
              Get a dedicated account to pay for orders by bank transfer.
            </Text>
            <Button
              label="Get my transfer account"
              variant="outline"
              size="sm"
              style={{ alignSelf: 'flex-start' }}
              onPress={async () => {
                try {
                  await createDedicatedAccount();
                  account.reload();
                  toast.show('Transfer account created', 'success');
                } catch (err) {
                  toast.show(errorMessage(err), 'error');
                }
              }}
            />
          </>
        )}
      </Card>

      <Text variant="heading">History</Text>
      {history.loading ? (
        <ListSkeleton rows={4} />
      ) : history.error ? (
        <ErrorState message={history.error} onRetry={history.refresh} />
      ) : (history.data ?? []).length === 0 ? (
        <EmptyState illustration="no-results" title="No payments yet" description="Payments for your orders will show here." />
      ) : (
        (history.data ?? []).map((p) => (
          <Card key={p.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text weight="semibold" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
                {p.order?.order_number || p.order_number || titleCase(p.purpose || 'Payment')}
              </Text>
              <StatusBadge status={p.status} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption">
                {formatDateTime(p.paid_at || p.created_at)}
                {p.channel ? ` · ${titleCase(p.channel)}` : ''}
              </Text>
              <Text variant="price" size={15}>
                {formatMoney(p.amount, p.currency)}
              </Text>
            </View>
            {p.reference ? <Text variant="caption">Ref: {p.reference}</Text> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
