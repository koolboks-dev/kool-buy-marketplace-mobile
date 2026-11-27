import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Button, Card, PromptSheet, StatusBadge, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { approveRefund, listAdminRefunds, rejectRefund, type AdminRefund } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'pending' | 'approved' | 'processed' | 'rejected' | 'all';

/** Refunds (web /admin/refunds): review, approve and track refunds to buyers. */
export default function AdminRefunds() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const [decide, setDecide] = useState<{ refund: AdminRefund; action: 'approve' | 'reject'; reload: () => void } | null>(null);
  const canDecide = can(['refunds.approve', 'refunds.edit', 'refunds.*']);

  return (
    <>
      <AdminList<AdminRefund, Tab>
        title="Refunds"
        subtitle="Review, approve and track refunds to buyers"
        tabs={[
          { value: 'pending', label: 'Pending', countKey: 'pending' },
          { value: 'approved', label: 'Approved', countKey: 'approved' },
          { value: 'processed', label: 'Processed', countKey: 'processed' },
          { value: 'rejected', label: 'Rejected', countKey: 'rejected' },
          { value: 'all', label: 'All', countKey: 'all' },
        ]}
        keyOf={(r) => r.id}
        empty={{ title: 'No refunds here' }}
        fetchPage={async ({ page, tab }) => {
          const r = await listAdminRefunds({ page, status: tab === 'all' ? undefined : tab });
          return { items: r.items, counts: r.counts, ...pageInfo(r.pagination, page, r.items.length) };
        }}
        renderItem={(r, { reload }) => (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text variant="price" size={16}>
                {formatMoney(r.amount, r.currency)}
              </Text>
              <StatusBadge status={r.status} />
            </View>
            <Text weight="medium" color={colors.text}>
              {r.buyer?.name || r.buyer?.email || 'Buyer'}
              {r.order ? ` · ${r.order.order_number}` : ''}
            </Text>
            {r.reason ? <Text variant="secondary" size={13}>{r.reason}</Text> : null}
            <Text variant="caption">
              Requested {formatDateTime(r.created_at)}
              {r.requested_by ? ` by ${r.requested_by}` : ''}
            </Text>
            {r.decision_note ? <Text variant="caption">Note: {r.decision_note}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {r.order ? <Button label="Order" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: r.order!.id } })} /> : null}
              {canDecide && r.status === 'pending' ? (
                <>
                  <Button label="Approve" size="sm" variant="ink" onPress={() => setDecide({ refund: r, action: 'approve', reload })} />
                  <Button label="Reject" size="sm" variant="outline" onPress={() => setDecide({ refund: r, action: 'reject', reload })} />
                </>
              ) : null}
            </View>
          </Card>
        )}
      />
      <PromptSheet
        visible={Boolean(decide)}
        onClose={() => setDecide(null)}
        title={decide?.action === 'approve' ? 'Approve this refund?' : 'Reject this refund?'}
        description={decide ? formatMoney(decide.refund.amount, decide.refund.currency) : undefined}
        label="Note"
        required={decide?.action === 'reject'}
        destructive={decide?.action === 'reject'}
        confirmLabel={decide?.action === 'approve' ? 'Approve refund' : 'Reject refund'}
        onConfirm={async (note) => {
          if (!decide) return;
          try {
            if (decide.action === 'approve') await approveRefund(decide.refund.id, note || undefined);
            else await rejectRefund(decide.refund.id, note);
            toast.show(decide.action === 'approve' ? 'Refund approved' : 'Refund rejected', 'success');
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
