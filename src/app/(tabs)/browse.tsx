import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VendorCard } from '@/components/marketplace/VendorCard';
import { AppHeader, Chip, EmptyState, ErrorState, IconButton, ListSkeleton, SearchBar, Select, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { listProductStates, listVendors } from '@/services/catalog';
import { useSession } from '@/store/session';
import { TAB_BAR_SPACE } from '@/components/ui/TabBar';
import { useLayout, useTheme } from '@/theme';

const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'newest', label: 'Newest' },
] as const;

/** The web /vendors page: every store, searchable, by state and sort. */
export default function BrowseScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter, contentWidth, columns } = useLayout();
  const { user, isSeller } = useSession();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('popular');
  const [state, setState] = useState('');
  const [supplyChain, setSupplyChain] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const states = useAsync(() => listProductStates().then((r) => r.items ?? []), []);
  const vendors = useAsync(
    () =>
      listVendors({
        query: debounced || undefined,
        sort,
        state: state || undefined,
        market: user?.market,
        page_size: 60,
        business_type: supplyChain ? 'distributor,wholesaler' : undefined,
      }),
    [debounced, sort, state, user?.market, supplyChain],
  );

  const cols = columns(260);
  const inner = contentWidth - gutter * 2;
  const cardW = (inner - 12 * (cols - 1)) / cols;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Browse stores" subtitle="Verified vendors of fresh and frozen goods" back={false} right={<IconButton icon="search" label="Search products" size={38} onPress={() => router.push('/search')} />} />
      <FlatList
        data={vendors.data ?? []}
        key={cols}
        numColumns={cols}
        keyExtractor={(v) => v.id}
        columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 16, paddingBottom: insets.bottom + TAB_BAR_SPACE + 16, gap: 12, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={vendors.refreshing} onRefresh={vendors.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search stores by name" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SORTS.map((s) => (
                <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
              ))}
              {isSeller ? <Chip label="Suppliers" icon="truck" active={supplyChain} onPress={() => setSupplyChain((v) => !v)} /> : null}
            </View>
            <Select
              label="State"
              value={state}
              placeholder="All locations"
              options={[{ value: '', label: 'All locations' }, ...(states.data ?? []).map((s) => ({ value: s.value, label: `${s.label} (${s.product_count})` }))]}
              onChange={setState}
            />
            {!vendors.loading && vendors.data ? <Text variant="caption">{vendors.data.length} stores</Text> : null}
          </View>
        }
        ListEmptyComponent={
          vendors.loading ? (
            <ListSkeleton rows={4} height={180} />
          ) : vendors.error ? (
            <ErrorState message={vendors.error} onRetry={vendors.refresh} />
          ) : (
            <EmptyState illustration="no-vendors" title={debounced ? `No stores match “${debounced}”` : 'No stores found'} description="Try another name or location." />
          )
        }
        renderItem={({ item }) => <VendorCard v={item} width={cols > 1 ? cardW : undefined} />}
      />
    </View>
  );
}
