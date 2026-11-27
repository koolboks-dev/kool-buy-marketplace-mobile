import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';

import { ProductCard, useAddToCart } from '@/components/marketplace/ProductCard';
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Glyph,
  IconButton,
  InfoRow,
  ListSkeleton,
  SmartImage,
  Stars,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { addVendorToFavorites, getVendorDetails, removeVendorFromFavorites } from '@/services/catalog';
import { useSession } from '@/store/session';
import { useLayout, useTheme } from '@/theme';

const SORTS = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'newest', label: 'Newest' },
];

const hours = (o?: string, c?: string) => (o && c ? `${o.slice(0, 5)} – ${c.slice(0, 5)}` : '—');

/** The storefront (web /vendors/[vendorId]). */
export default function VendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { gutter, contentWidth, columns } = useLayout();
  const { status } = useSession();
  const toast = useToast();
  const { addProduct, busyId } = useAddToCart();
  const [sort, setSort] = useState('');
  const [fav, setFav] = useState<boolean | null>(null);

  const q = useAsync(() => getVendorDetails(id, { sort: sort || undefined }), [id, sort]);
  const v = q.data?.vendor;
  const isFav = fav ?? Boolean(v?.is_favorite);

  const toggleFav = async () => {
    if (status !== 'signedIn') {
      router.push('/login');
      return;
    }
    const next = !isFav;
    setFav(next);
    try {
      if (next) await addVendorToFavorites(id);
      else await removeVendorFromFavorites(id);
      toast.show(next ? 'Store saved' : 'Removed from saved stores', 'success');
    } catch (err) {
      setFav(!next);
      toast.show(errorMessage(err), 'error');
    }
  };

  const inner = contentWidth - gutter * 2;
  const cols = columns(165);
  const cardW = (inner - 12 * (cols - 1)) / cols;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title={v?.name ?? 'Store'}
        subtitle={v?.location_label || undefined}
        right={<IconButton icon={isFav ? 'heart-filled' : 'heart'} color={isFav ? colors.brand : undefined} label={isFav ? 'Remove from saved' : 'Save store'} size={38} onPress={toggleFav} />}
      />
      {q.loading ? (
        <View style={{ padding: gutter }}>
          <ListSkeleton rows={4} height={160} />
        </View>
      ) : q.error || !v ? (
        <ErrorState message={q.error ?? 'This store is not available.'} onRetry={q.refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        >
          <SmartImage uri={v.cover_image_url} category="produce" style={{ width: '100%', height: 150 }} />
          <View style={{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: gutter, gap: 16 }}>
            <Card style={{ marginTop: -36, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Avatar uri={v.image_url} name={v.name} size={56} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="heading" numberOfLines={2} style={{ flexShrink: 1 }}>
                      {v.name}
                    </Text>
                    <Glyph name="check-circle" size={16} color={colors.brand} />
                  </View>
                  <Stars rating={v.rating || 0} count={v.review_count} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {v.business_type ? <Badge label={v.business_type.replace(/_/g, ' ')} /> : null}
                {v.is_cold_chain_verified ? <Badge label="Cold-chain verified" tone="verified" icon="snowflake" /> : null}
                {v.joined_year ? <Badge label={`Since ${v.joined_year}`} /> : null}
              </View>
              {v.address ? (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Glyph name="location" size={15} color={colors.textMuted} />
                  <Text variant="secondary" size={13} style={{ flex: 1 }}>
                    {v.address}
                  </Text>
                </View>
              ) : null}
              {v.show_phone !== false && v.phone_number ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Call" icon="phone" variant="outline" size="sm" onPress={() => Linking.openURL(`tel:${v.phone_number}`)} style={{ flex: 1 }} />
                  <Button
                    label="WhatsApp"
                    icon="whatsapp"
                    variant="outline"
                    size="sm"
                    onPress={() => Linking.openURL(`https://wa.me/${String(v.phone_number).replace(/\D/g, '').replace(/^0/, '234')}`)}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </Card>

            {v.business_hours ? (
              <Card padding={14}>
                <Text variant="subtitle" style={{ marginBottom: 4 }}>
                  Opening hours
                </Text>
                <InfoRow label="Monday – Friday" value={hours(v.business_hours.weekday?.open_time, v.business_hours.weekday?.close_time)} icon="clock" />
                <InfoRow label="Saturday" value={v.business_hours.saturday?.is_closed ? 'Closed' : hours(v.business_hours.saturday?.open_time, v.business_hours.saturday?.close_time)} />
                <InfoRow label="Sunday" value={v.business_hours.sunday?.is_closed ? 'Closed' : hours(v.business_hours.sunday?.open_time, v.business_hours.sunday?.close_time)} last />
              </Card>
            ) : null}

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="heading">Products</Text>
                <Text variant="caption">{q.data?.pagination?.total ?? q.data?.products.length ?? 0} items</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORTS.map((s) => (
                  <Chip key={s.value || 'featured'} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
                ))}
              </ScrollView>
              {(q.data?.products ?? []).length === 0 ? (
                <Card>
                  <EmptyState compact illustration="no-results" title="No products yet" description="This store hasn't listed any products." />
                </Card>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {(q.data?.products ?? []).map((p) => (
                    <ProductCard
                      key={p.id}
                      width={cardW}
                      p={{
                        id: p.id,
                        name: p.name,
                        vendorName: v.name,
                        vendorId: v.id,
                        price: p.price,
                        market: p.market,
                        rating: p.rating,
                        imageUrl: p.image_url,
                        category: typeof p.category === 'object' ? p.category?.value : p.category,
                        productType: typeof p.product_type === 'object' ? p.product_type?.label : p.product_type,
                        stockQuantity: p.stock_quantity,
                        inStock: p.in_stock,
                      }}
                      adding={busyId === p.id}
                      onAdd={() => addProduct(p.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
