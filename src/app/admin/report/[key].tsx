import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, Input, ListSkeleton, Screen, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { WEB_BASE_URL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { runReport } from '@/services/admin';
import { useTheme } from '@/theme';

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/** Report preview (web /admin/reports → preview). Export to CSV/Excel stays on the web. */
export default function AdminReport() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { colors } = useTheme();
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [range, setRange] = useState({ date_from: from, date_to: to });
  const q = useAsync(() => runReport(key, range), [key, range]);
  const r = q.data;

  return (
    <Screen title={r?.report.title ?? 'Report'} subtitle={r?.report.about} refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/reports">
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Run" variant="ink" size="sm" onPress={() => setRange({ date_from: from, date_to: to })} />
          <Button label="Export on web" variant="outline" size="sm" icon="external" onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/admin/reports`)} />
        </View>
      </Card>
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : !r || r.rows.length === 0 ? (
        <EmptyState illustration="no-results" title="No rows for this period" />
      ) : (
        <>
          {r.totals?.length ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">Totals</Text>
              {r.totals.map((t, i) => (
                <View key={i} style={{ gap: 2 }}>
                  {Object.entries(t.values).map(([k, v]) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="secondary">{r.columns.find((c) => c.key === k)?.label ?? k}</Text>
                      <Text weight="semibold" color={colors.text}>
                        {t.currency ? formatMoney(v, t.currency) : String(v)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </Card>
          ) : null}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                <View style={{ flexDirection: 'row', backgroundColor: colors.muted, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {r.columns.map((c) => (
                    <Text key={c.key} variant="caption" weight="medium" style={{ width: 150, padding: 10 }}>
                      {c.label}
                    </Text>
                  ))}
                </View>
                {r.rows.slice(0, 200).map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    {r.columns.map((c) => (
                      <Text key={c.key} size={13} style={{ width: 150, padding: 10 }} numberOfLines={2}>
                        {row[c.key] == null ? '—' : String(row[c.key])}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
          {r.truncated || r.rows.length > 200 ? <Text variant="caption">Showing the first rows. Export on the web for the full report.</Text> : null}
        </>
      )}
    </Screen>
  );
}
