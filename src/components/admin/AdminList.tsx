import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppHeader, EmptyState, ErrorState, FilterTabs, ListSkeleton, Loader, SearchBar, Text } from '@/components/ui';
import { usePaged } from '@/hooks/useAsync';
import type { IllustrationName } from '@/lib/brand-svg';
import { useLayout, useTheme } from '@/theme';

export interface PageResult<T> {
  items: T[];
  hasNext: boolean;
  total?: number;
  counts?: Record<string, number | undefined> | null;
}

/**
 * The admin table, as a mobile list: heading/subheading (web PageHeading),
 * search, CRM filter tabs with counts, infinite scroll and pull-to-refresh.
 */
export function AdminList<T, F extends string = string>({
  title,
  subtitle,
  fetchPage,
  renderItem,
  keyOf,
  tabs,
  initialTab,
  searchPlaceholder,
  headerRight,
  empty = { title: 'Nothing here yet' },
  illustration = 'no-results',
  above,
  deps = [],
  backFallback = '/admin',
}: {
  title: string;
  subtitle?: string;
  fetchPage: (args: { page: number; q: string; tab: F }) => Promise<PageResult<T>>;
  renderItem: (item: T, helpers: { reload: () => void; update: (fn: (items: T[]) => T[]) => void }) => ReactElement;
  keyOf: (item: T) => string;
  tabs?: { value: F; label: string; countKey?: string }[];
  initialTab?: F;
  searchPlaceholder?: string;
  headerRight?: ReactNode;
  empty?: { title: string; description?: string };
  illustration?: IllustrationName;
  above?: ReactNode;
  deps?: unknown[];
  backFallback?: string;
}) {
  const { colors } = useTheme();
  const { gutter, contentWidth } = useLayout();
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<F>((initialTab ?? tabs?.[0]?.value ?? '') as F);
  const [counts, setCounts] = useState<Record<string, number | undefined> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const list = usePaged<T>(async (page) => {
    const r = await fetchPage({ page, q, tab });
    if (r.counts) setCounts(r.counts);
    return { items: r.items, hasNext: r.hasNext, total: r.total };
  }, [q, tab, ...deps]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={title} subtitle={subtitle} right={headerRight} backFallback={backFallback} />
      <FlatList
        data={list.items}
        keyExtractor={keyOf}
        contentContainerStyle={{ padding: gutter, gap: 10, paddingBottom: 40, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            {above}
            {searchPlaceholder ? <SearchBar value={query} onChangeText={setQuery} placeholder={searchPlaceholder} /> : null}
            {tabs?.length ? (
              <FilterTabs value={tab} onChange={setTab} tabs={tabs.map((t) => ({ value: t.value, label: t.label, count: t.countKey && counts ? counts[t.countKey] ?? null : null }))} />
            ) : null}
            {list.total != null ? <Text variant="caption">{list.total.toLocaleString()} results</Text> : null}
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <ListSkeleton rows={6} height={84} />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.refresh} />
          ) : (
            <EmptyState illustration={illustration} title={q ? `No results for “${q}”` : empty.title} description={empty.description} />
          )
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item }) => renderItem(item, { reload: list.refresh, update: list.setItems })}
      />
    </View>
  );
}

/** Normalise the many pagination shapes the admin API returns. */
export function pageInfo(p: { has_next?: boolean; total?: number; page?: number; page_size?: number } | null | undefined, page: number, got: number, size = 20) {
  const total = p?.total;
  const hasNext = p?.has_next ?? (total != null ? page * (p?.page_size ?? size) < total : got >= size);
  return { hasNext, total };
}
