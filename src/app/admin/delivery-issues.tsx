import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Badge, Button, Card, PromptSheet, StatusBadge, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { listDeliveryIssues, resolveDeliveryIssue, type AdminIssueRow } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'open' | 'resolved' | 'all';

/** Delivery Issues (web /admin/delivery-issues): review and resolve. */
export default function AdminDeliveryIssues() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const [resolve, setResolve] = useState<{ issue: AdminIssueRow; reload: () => void } | null>(null);

  return (
    <>
      <AdminList<AdminIssueRow, Tab>
        title="Delivery Issues"
        subtitle="Review and resolve delivery problems"
        tabs={[
          { value: 'open', label: 'Open', countKey: 'open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'all', label: 'All', countKey: 'all' },
        ]}
        keyOf={(i) => i.issue_id}
        illustration="success"
        empty={{ title: 'No issues', description: 'Problems reported by riders or customers show up here.' }}
        fetchPage={async ({ page, tab }) => {
          const r = await listDeliveryIssues({ page, status: tab === 'all' ? undefined : tab });
          return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
        }}
        renderItem={(i, { reload }) => (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text weight="semibold" color={colors.text} style={{ flex: 1 }}>
                {i.category_display}
              </Text>
              <StatusBadge status={i.status} />
            </View>
            <Text size={13}>{i.description}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {i.order_number ? <Badge label={i.order_number} icon="receipt" /> : null}
              {i.customer ? <Badge label={i.customer} icon="user" /> : null}
              {i.assigned_to ? <Badge label={`Assigned: ${i.assigned_to}`} /> : null}
            </View>
            <Text variant="caption">
              {formatDateTime(i.created_at)}
              {i.reported_by ? ` · reported by ${i.reported_by}` : ''}
            </Text>
            {i.resolution_notes ? <Text variant="caption">Resolution: {i.resolution_notes}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button label="Delivery" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/admin/delivery/[id]', params: { id: i.delivery_id } })} />
              {i.status !== 'resolved' && i.status !== 'closed' && can(['deliveries.edit', 'deliveries.*', 'logistics.dispatch']) ? (
                <Button label="Resolve" size="sm" variant="ink" onPress={() => setResolve({ issue: i, reload })} />
              ) : null}
            </View>
          </Card>
        )}
      />
      <PromptSheet
        visible={Boolean(resolve)}
        onClose={() => setResolve(null)}
        title="Resolve this issue"
        label="What was done"
        minLength={3}
        confirmLabel="Mark resolved"
        onConfirm={async (notes) => {
          if (!resolve) return;
          try {
            await resolveDeliveryIssue(resolve.issue.issue_id, notes);
            toast.show('Issue resolved', 'success');
            resolve.reload();
            setResolve(null);
          } catch (err) {
            toast.show(errorMessage(err), 'error');
          }
        }}
      />
    </>
  );
}
