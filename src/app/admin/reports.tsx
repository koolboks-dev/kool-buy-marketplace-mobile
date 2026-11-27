import { View } from 'react-native';

import { MenuSections } from '@/components/MenuSections';
import { EmptyState, ErrorState, ListSkeleton, Screen } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import type { MenuItem } from '@/lib/nav';
import { listReports } from '@/services/admin';

/** Reports (web /admin/reports): sales, finance, margins and operations. */
export default function AdminReports() {
  const q = useAsync(() => listReports(), []);
  const groups = new Map((q.data?.groups ?? []).map((g) => [g.key, g.label]));
  const items: MenuItem[] = (q.data?.items ?? []).map((r) => ({
    href: `/admin/report/${encodeURIComponent(r.key)}`,
    label: r.title,
    subtitle: r.about,
    icon: r.group === 'finance' ? 'money' : r.group === 'sales' ? 'trending' : r.group === 'margins' ? 'tag' : 'chart',
    section: groups.get(r.group) ?? r.group,
  }));
  items.sort((a, b) => String(a.section).localeCompare(String(b.section)));
  return (
    <Screen title="Reports" subtitle="Preview sales, finance, margins and operations" refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin">
      {q.loading ? (
        <ListSkeleton rows={6} height={60} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : items.length === 0 ? (
        <EmptyState illustration="no-results" title="No reports available" />
      ) : (
        <View>
          <MenuSections items={items} />
        </View>
      )}
    </Screen>
  );
}
