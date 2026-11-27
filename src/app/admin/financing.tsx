import { useState } from 'react';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Button, Card, InfoRow, PromptSheet, StatTile, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatCompactMoney, formatDateTime, formatMoney } from '@/lib/format';
import { approveFinancingApplication, declineFinancingApplication, getFinancingDashboard, listFinancingApplications } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'pending' | 'approved' | 'declined' | 'all';
type App = Record<string, any>;

/** Credit (web /admin/financing): pay-later applications, approve or decline. */
export default function AdminCredit() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const dash = useAsync(() => getFinancingDashboard().catch(() => null), []);
  const [decide, setDecide] = useState<{ app: App; action: 'approve' | 'decline'; reload: () => void } | null>(null);
  const canDecide = can(['credit.approve', 'credit.edit', 'credit.*']);
  const d = (dash.data ?? {}) as Record<string, any>;
  const totals = d.totals ?? d.summary ?? d;

  return (
    <>
      <AdminList<App, Tab>
        title="Credit"
        subtitle="Review pay-later applications, invoices and repayments"
        searchPlaceholder="Customer or invoice"
        tabs={[
          { value: 'pending', label: 'To review', countKey: 'pending' },
          { value: 'approved', label: 'Approved', countKey: 'approved' },
          { value: 'declined', label: 'Declined', countKey: 'declined' },
          { value: 'all', label: 'All', countKey: 'all' },
        ]}
        keyOf={(a) => String(a.id)}
        above={
          totals && (totals.outstanding != null || totals.disbursed != null) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {totals.outstanding != null ? <StatTile label="Outstanding" value={formatCompactMoney(totals.outstanding, totals.currency)} icon="money" /> : null}
              {totals.overdue != null ? <StatTile label="Overdue" value={formatCompactMoney(totals.overdue, totals.currency)} icon="warning" /> : null}
            </View>
          ) : null
        }
        empty={{ title: 'No applications here' }}
        fetchPage={async ({ page, q, tab }) => {
          const r = await listFinancingApplications({ page, search: q || undefined, status: tab === 'all' ? undefined : tab });
          const items = r.items ?? r.results ?? [];
          return { items, counts: r.counts, ...pageInfo(r.pagination, page, items.length) };
        }}
        renderItem={(a, { reload }) => {
          const buyer = a.buyer ?? a.applicant ?? {};
          const currency = a.currency ?? 'NGN';
          return (
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text weight="semibold" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
                  {buyer.name ?? a.customer_name ?? 'Customer'}
                </Text>
                <StatusBadge status={a.status} />
              </View>
              <InfoRow label="Amount" value={formatMoney(a.amount ?? a.total ?? a.principal, currency)} />
              {a.tenor_days ?? a.financing_tenor_days ? <InfoRow label="Term" value={`${a.tenor_days ?? a.financing_tenor_days} days`} /> : null}
              {a.invoice_number ? <InfoRow label="Invoice" value={a.invoice_number} /> : null}
              <InfoRow label="Submitted" value={formatDateTime(a.created_at ?? a.submitted_at)} />
              {a.review_due_at ? <InfoRow label="Review by" value={formatDateTime(a.review_due_at)} last /> : null}
              {canDecide && ['pending', 'submitted', 'under_review', 'pending_review'].includes(String(a.status)) ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Button label="Approve" size="sm" variant="ink" onPress={() => setDecide({ app: a, action: 'approve', reload })} />
                  <Button label="Decline" size="sm" variant="outline" onPress={() => setDecide({ app: a, action: 'decline', reload })} />
                </View>
              ) : null}
            </Card>
          );
        }}
      />
      <PromptSheet
        visible={Boolean(decide)}
        onClose={() => setDecide(null)}
        title={decide?.action === 'approve' ? 'Approve this application?' : 'Decline this application?'}
        description={decide?.action === 'decline' ? 'The order falls back to pay-now for the buyer.' : 'The order goes ahead on credit.'}
        label={decide?.action === 'approve' ? 'Note (optional)' : 'Reason'}
        required={decide?.action === 'decline'}
        destructive={decide?.action === 'decline'}
        confirmLabel={decide?.action === 'approve' ? 'Approve' : 'Decline'}
        onConfirm={async (text) => {
          if (!decide) return;
          try {
            if (decide.action === 'approve') await approveFinancingApplication(String(decide.app.id), text || undefined);
            else await declineFinancingApplication(String(decide.app.id), text);
            toast.show(decide.action === 'approve' ? 'Approved' : 'Declined', 'success');
            decide.reload();
            setDecide(null);
          } catch (err) {
            toast.show(errorMessage(err), 'error');
          }
        }}
      />
    </>
  );
}
