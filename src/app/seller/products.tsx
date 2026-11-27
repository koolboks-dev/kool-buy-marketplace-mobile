import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppHeader, Badge, Button, EmptyState, ErrorState, FilterTabs, ListSkeleton, Loader, SearchBar, SmartImage, Switch, Text, useToast } from '@/components/ui';
import { usePaged } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { listMyProducts, productImage, updateMyProduct } from '@/services/seller';
import type { SellerProduct } from '@/services/types';
import { putMany } from '@/store/cache';
import { useSession } from '@/store/session';
import { radius, useLayout, useTheme } from '@/theme';

type Filter = 'all' | 'active' | 'hidden' | 'out';

/** Products / Bulk Inventory (web /retailer/products, /wholesaler/products). */
export default function SellerProducts() {
  const { colors } = useTheme();
  const { gutter, contentWidth } = useLayout();
  const { user, isWholesaler } = useSession();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = usePaged<SellerProduct>(async (page) => {
    const r = await listMyProducts(page, 50);
    putMany('seller-product', r.items ?? []);
    return { items: r.items ?? [], hasNext: Boolean(r.pagination?.has_next), total: r.pagination?.total };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.items.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter === 'active') return p.is_active;
      if (filter === 'hidden') return !p.is_active;
      if (filter === 'out') return !p.in_stock || p.stock_quantity === 0;
      return true;
    });
  }, [list.items, query, filter]);

  const toggleActive = async (p: SellerProduct, is_active: boolean) => {
    list.setItems((items) => items.map((x) => (x.id === p.id ? { ...x, is_active } : x)));
    try {
      await updateMyProduct(p.id, { is_active });
    } catch (err) {
      list.setItems((items) => items.map((x) => (x.id === p.id ? { ...x, is_active: !is_active } : x)));
      toast.show(errorMessage(err), 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title={isWholesaler ? 'Bulk Inventory' : 'Products'}
        subtitle={list.total != null ? `${list.total} products` : undefined}
        backFallback="/seller"
        right={<Button label="Add" icon="plus" size="sm" variant="ink" onPress={() => router.push({ pathname: '/seller/product/[id]', params: { id: 'new' } })} />}
      />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: gutter, gap: 10, paddingBottom: 40, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        onEndReached={list.loadMore}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search your products" />
            <FilterTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: 'All', count: list.items.length },
                { value: 'active', label: 'Live', count: list.items.filter((p) => p.is_active).length },
                { value: 'hidden', label: 'Hidden', count: list.items.filter((p) => !p.is_active).length },
                { value: 'out', label: 'Out of stock', count: list.items.filter((p) => !p.in_stock || p.stock_quantity === 0).length },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <ListSkeleton rows={5} height={86} />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.refresh} />
          ) : (
            <EmptyState illustration="no-results" title="No products" description="Add your first product so buyers can order from you." action="Add a product" onAction={() => router.push({ pathname: '/seller/product/[id]', params: { id: 'new' } })} />
          )
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item: p }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/seller/product/[id]', params: { id: p.id } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 12,
              padding: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: pressed ? colors.borderStrong : colors.border,
              borderRadius: radius.lg,
              alignItems: 'center',
            })}
          >
            <SmartImage uri={productImage(p)} category={p.category?.value} style={{ width: 60, height: 60, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text weight="semibold" color={colors.text} numberOfLines={1}>
                {p.name}
              </Text>
              <Text variant="caption">
                {formatMoney(p.price, user?.market)} / {p.unit}
                {p.category?.label ? ` · ${p.category.label}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {!p.in_stock || p.stock_quantity === 0 ? <Badge label="Out of stock" tone="danger" /> : p.stock_quantity != null ? <Badge label={`${p.stock_quantity} in stock`} /> : <Badge label="In stock" />}
                {!p.is_active ? <Badge label="Hidden" /> : null}
              </View>
            </View>
            <Switch value={p.is_active} onValueChange={(v) => toggleActive(p, v)} />
          </Pressable>
        )}
      />
    </View>
  );
}
