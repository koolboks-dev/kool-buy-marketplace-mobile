import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { stockInfo, useAddToCart } from '@/components/marketplace/ProductCard';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InfoRow,
  ListRow,
  ListSkeleton,
  QuantityStepper,
  Screen,
  SmartImage,
  Stars,
  Text,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatMoney, timeAgo } from '@/lib/format';
import { getProductDetails, getProductReviews } from '@/services/catalog';
import { useCart } from '@/store/cart';
import { radius, useLayout, useTheme } from '@/theme';

/** Product detail (web /vendors/[vendorId]/products/[productId]). */
export default function ProductScreen() {
  const { id, vendorId } = useLocalSearchParams<{ id: string; vendorId?: string }>();
  const { colors } = useTheme();
  const { contentWidth, gutter, isTablet } = useLayout();
  const { addProduct, busyId } = useAddToCart();
  const { count } = useCart();
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);

  const q = useAsync(() => getProductDetails(id), [id]);
  const reviews = useAsync(() => getProductReviews(id, 1, 10).then((r) => r.items ?? []).catch(() => []), [id]);
  const p = q.data;
  const stock = stockInfo(p?.stock_quantity, p?.in_stock);
  const imgW = Math.min(contentWidth, isTablet ? 640 : contentWidth) - gutter * 2;
  const images = p?.images?.length ? p.images : [''];
  const vId = p?.vendor?.id || vendorId;

  return (
    <Screen
      title={p?.name ?? 'Product'}
      subtitle={p?.vendor?.name}
      headerRight={count > 0 ? <Button label={`Cart (${count})`} size="sm" variant="outline" icon="cart" onPress={() => router.push('/(tabs)/cart')} /> : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      narrow={isTablet}
      footer={
        p ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <QuantityStepper value={qty} onChange={setQty} min={1} max={stock.quantity ?? undefined} disabled={stock.out} />
            <Button
              label={stock.out ? 'Out of stock' : `Add to cart · ${formatMoney(p.price * qty, p.market)}`}
              variant="primary"
              icon="cart-plus"
              disabled={stock.out}
              loading={busyId === p.id}
              onPress={() => addProduct(p.id, qty)}
              style={{ flex: 1 }}
            />
          </View>
        ) : undefined
      }
    >
      {q.loading ? (
        <ListSkeleton rows={3} height={140} />
      ) : !p ? (
        q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : <EmptyState illustration="no-results" title="Product not found" description="It may have been removed by the vendor." />
      ) : (
        <>
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => `${u}-${i}`}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setSlide(Math.round(e.nativeEvent.contentOffset.x / imgW))}
              style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}
              renderItem={({ item }) => <SmartImage uri={item} category={p.category?.value} style={{ width: imgW, height: imgW * 0.78 }} />}
            />
            {images.length > 1 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                {images.map((_, i) => (
                  <View key={i} style={{ width: i === slide ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === slide ? colors.brand : colors.borderStrong }} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {p.category?.label ? <Badge label={p.category.label} /> : null}
              {p.product_type?.label ? <Badge label={p.product_type.label} icon="snowflake" /> : null}
              {stock.out ? (
                <Badge label="Out of stock" tone="danger" />
              ) : stock.quantity != null ? (
                <Badge label={stock.low ? `Only ${stock.quantity} left` : `${stock.quantity} in stock`} tone={stock.low ? 'warning' : 'neutral'} />
              ) : (
                <Badge label="In stock" />
              )}
            </View>
            <Text variant="title">{p.name}</Text>
            <Stars rating={p.rating || 0} count={p.review_count} />
            <Text variant="price" size={26}>
              {formatMoney(p.price, p.market)}
            </Text>
          </View>

          {p.vendor ? (
            <Card padding={0}>
              <ListRow
                title={p.vendor.name}
                subtitle="View store and more products"
                right={<Avatar uri={p.vendor_image_url} name={p.vendor.name} size={34} />}
                onPress={() => vId && router.push({ pathname: '/vendor/[id]', params: { id: vId } })}
                last
              />
            </Card>
          ) : null}

          {p.description ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">Description</Text>
              <Text>{p.description}</Text>
            </Card>
          ) : null}

          {p.attributes && Object.keys(p.attributes).length ? (
            <Card padding={14}>
              <Text variant="subtitle" style={{ marginBottom: 4 }}>
                Details
              </Text>
              {Object.entries(p.attributes).map(([k, val], i, arr) => (
                <InfoRow key={k} label={k} value={String(val)} last={i === arr.length - 1} />
              ))}
            </Card>
          ) : null}

          <Card style={{ gap: 10 }}>
            <Text variant="subtitle">Reviews</Text>
            {(reviews.data ?? []).length === 0 ? (
              <Text variant="caption">No reviews yet. Buyers can review after their order is delivered.</Text>
            ) : (
              (reviews.data ?? []).map((r) => (
                <View key={r.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Avatar uri={r.user_avatar_url} name={r.user_name} size={32} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text weight="semibold" size={13} color={colors.text}>
                        {r.user_name || 'Buyer'}
                      </Text>
                      <Text variant="caption">{timeAgo(r.created_at)}</Text>
                    </View>
                    <Stars rating={r.rating} size={11} showValue={false} />
                    {r.comment ? <Text size={13}>{r.comment}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
