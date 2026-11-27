import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Badge, Button, Card, StatTile, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/format';
import { getNotificationStats, listNotificationLog, retryNotification } from '@/services/admin';
import { useTheme } from '@/theme';

type Row = NonNullable<Awaited<ReturnType<typeof listNotificationLog>>['items']>[number];
type Tab = 'all' | 'failed' | 'queued' | 'sent' | 'delivered';

/** Notification Log (web /admin/notifications): every notice and email, with its delivery status. */
export default function AdminNotificationLog() {
  const { colors } = useTheme();
  const toast = useToast();
  const stats = useAsync(() => getNotificationStats().catch(() => null), []);
  return (
    <AdminList<Row, Tab>
      title="Notification Log"
      subtitle="Every notice and email the platform sent"
      searchPlaceholder="Recipient or subject"
      tabs={[
        { value: 'all', label: 'All' },
        { value: 'failed', label: 'Failed' },
        { value: 'queued', label: 'Queued' },
        { value: 'sent', label: 'Sent' },
        { value: 'delivered', label: 'Delivered' },
      ]}
      keyOf={(r) => r.id}
      above={
        stats.data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatTile label="Problems" value={stats.data.problems} icon="warning" />
            <StatTile label="Sent" value={(stats.data.by_status?.sent ?? 0) + (stats.data.by_status?.delivered ?? 0)} icon="mail" />
          </View>
        ) : null
      }
      empty={{ title: 'Nothing sent yet' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listNotificationLog({ page, q: q || undefined, status: tab === 'all' ? undefined : tab });
        const items = r.items ?? [];
        return { items, ...pageInfo({ total: r.pagination?.total, page_size: 25 }, page, items.length, 25) };
      }}
      renderItem={(r, { reload }) => (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text weight="semibold" color={colors.text} style={{ flex: 1 }} numberOfLines={2}>
              {r.subject || r.kind_label}
            </Text>
            <StatusBadge status={r.status} />
          </View>
          <Text variant="caption" numberOfLines={1}>
            {r.recipient}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge label={titleCase(r.channel)} icon={r.channel === 'email' ? 'mail' : 'bell'} />
            <Badge label={r.kind_label} />
            {r.critical ? <Badge label="Critical" tone="danger" /> : null}
            <Badge label={`${r.attempts} attempt${r.attempts === 1 ? '' : 's'}`} />
          </View>
          {r.last_error ? <Text variant="caption" color={colors.dangerText}>{r.last_error}</Text> : null}
          <Text variant="caption">Queued {formatDateTime(r.queued_at)}{r.sent_at ? ` · sent ${formatDateTime(r.sent_at)}` : ''}</Text>
          {r.retryable ? (
            <Button
              label="Retry"
              icon="refresh"
              size="sm"
              variant="outline"
              style={{ alignSelf: 'flex-start' }}
              onPress={async () => {
                try {
                  await retryNotification(r.id);
                  toast.show('Queued again', 'success');
                  reload();
                } catch (err) {
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
