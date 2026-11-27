import { View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, InfoRow, ListSkeleton, Screen, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { timeAgo } from '@/lib/format';
import { getMyFreezers } from '@/services/seller';
import { useTheme } from '@/theme';

/** My Freezers (web /retailer/iot): live temperature, door and power, with alerts. */
export default function MyFreezers() {
  const { colors } = useTheme();
  const q = useAsync(() => getMyFreezers(), []);
  const d = q.data;

  return (
    <Screen title="My Freezers" subtitle="Live temperature, door and power for your Koolboks freezers" refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/seller">
      {q.loading ? (
        <ListSkeleton rows={3} height={150} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : !d || !d.devices?.length ? (
        <EmptyState illustration="cold-chain-delivery" title="No freezers linked yet" description="Once your Koolboks freezer is installed and linked to your account, its readings show up here." />
      ) : (
        <>
          {d.last_sync ? <Text variant="caption">Last updated {timeAgo(d.last_sync)}</Text> : null}
          {d.devices.map((f) => {
            const tone = f.temp_state === 'ok' ? colors.successText : f.temp_state === 'unknown' ? colors.textMuted : colors.dangerText;
            return (
              <Card key={f.serial} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="subtitle">{f.name || f.serial}</Text>
                    <Text variant="caption">
                      {f.serial}
                      {f.site ? ` · ${f.site}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={f.status === 'no_data' ? 'unknown' : f.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text variant="display" color={tone}>
                    {f.temperature != null ? `${f.temperature.toFixed(1)}°C` : '—'}
                  </Text>
                  {f.temp_min != null && f.temp_max != null ? <Text variant="caption">target {f.temp_min}° to {f.temp_max}°</Text> : null}
                </View>
                <InfoRow label="Door" value={f.reading?.door_state ? String(f.reading.door_state) : '—'} />
                <InfoRow label="Power" value={f.reading?.power_w != null ? `${f.reading.power_w} W` : '—'} />
                <InfoRow label="Battery" value={f.reading?.battery_pct != null ? `${f.reading.battery_pct}%` : '—'} />
                <InfoRow label="Last seen" value={f.last_seen ? timeAgo(f.last_seen) : '—'} last />
                {f.active_alerts?.length ? (
                  <View style={{ gap: 6 }}>
                    {f.active_alerts.map((a) => (
                      <Badge key={a.id} label={`${a.rule}: ${a.value}`} tone="danger" icon="warning" />
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
