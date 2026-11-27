import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { ProductCard, ProductRow, useAddToCart, type ProductCardData } from '@/components/marketplace/ProductCard';
import { AppHeader, Chip, EmptyState, ErrorState, IconButton, ListSkeleton, Loader, SearchBar, Select, Text } from '@/components/ui';
import { useAsync, usePaged } from '@/hooks/useAsync';
import { listProductCategories, listTemperatureTypes, searchProducts, type ProductSort } from '@/services/catalog';
import type { ProductSearchResult } from '@/services/types';
import { useSession } from '@/store/session';
import { useLayout, useTheme } from '@/theme';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

const toCard = (p: ProductSearchResult): ProductCardData => ({
  id: p.id,
  name: p.name,
  vendorName: p.vendor?.name,
  vendorId: p.vendor?.id,
  price: p.price,
  market: p.market,
  rating: p.rating,
  imageUrl: p.image_url,
  category: p.category?.value,
  productType: p.product_type?.label,
  stockQuantity: p.stock_quantity,
  inStock: p.in_stock,
  unit: p.unit,
  distanceKm: p.vendor?.distance_km ?? null,
});

/** The web /search page: products by keyword, category, temperature, sort and stock. */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { colors } = useTheme();
  const { gutter, contentWidth, columns } = useLayout();
  const { user } = useSession();
  const { addProduct, busyId } = useAddToCart();

  const [query, setQuery] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.category ?? '');
  const [temp, setTemp] = useState('');
  const [sort, setSort] = useState<ProductSort>('popular');
  const [inStock, setInStock] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const categories = useAsync(() => listProductCategories().then((r) => r.items ?? []), []);
  const temps = useAsync(() => listTemperatureTypes().then((r) => r.items ?? []), []);

  const list = usePaged<ProductSearchResult>(
    async (page) => {
      const r = await searchProducts({
        query: debounced || undefined,
        categories: category || undefined,
        temperature_type: temp || undefined,
        sort,
        in_stock: inStock,
        market: user?.market,
        page,
        page_size: 20,
      });
      return { items: r.items ?? [], hasNext: Boolean(r.pagination?.has_next), total: r.pagination?.total };
    },
    [debounced, category, temp, sort, inStock, user?.market],
  );

  const cols = view === 'grid' ? columns(165) : 1;
  const inner = contentWidth - gutter * 2;
  const cardW = (inner - 12 * (cols - 1)) / cols;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Search products"
        right={<IconButton icon={view === 'grid' ? 'list' : 'grid'} label={view === 'grid' ? 'List view' : 'Grid view'} size={38} onPress={() => setView(view === 'grid' ? 'list' : 'grid')} />}
      />
      <FlatList
        data={list.items}
        key={`${view}-${cols}`}
        numColumns={cols}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 16, paddingBottom: 40, gap: 12, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Fish, chicken, ice blocks…" autoFocus={!params.category} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="All" active={!category} onPress={() => setCategory('')} />
              {(categories.data ?? []).map((c) => (
                <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(category === c.value ? '' : c.value)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Select value={sort} options={SORTS} onChange={setSort} placeholder="Sort" />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  value={temp}
                  placeholder="Any temperature"
                  options={[{ value: '', label: 'Any temperature' }, ...(temps.data ?? [])]}
                  onChange={setTemp}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="caption">{list.total != null ? `${list.total} products` : ' '}</Text>
              <Chip label="In stock only" icon="check" active={inStock} onPress={() => setInStock((v) => !v)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <ListSkeleton rows={4} height={110} />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.refresh} />
          ) : (
            <EmptyState illustration="no-results" title={debounced ? `No products match “${debounced}”` : 'No products here yet'} description="Try a different word or remove a filter." />
          )
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item }) =>
          view === 'grid' ? (
            <ProductCard p={toCard(item)} width={cardW} adding={busyId === item.id} onAdd={() => addProduct(item.id)} />
          ) : (
            <ProductRow p={toCard(item)} adding={busyId === item.id} onAdd={() => addProduct(item.id)} />
          )
        }
      />
    </View>
  );
}
