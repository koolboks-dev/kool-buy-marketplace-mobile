import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge, Glyph, SmartImage, Stars, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

export interface ProductCardData {
  id: string;
  name: string;
  vendorName?: string;
  vendorId?: string;
  price: number | string;
  market?: string | null;
  rating?: number;
  imageUrl?: string | null;
  category?: string | null;
  productType?: string | null;
  distanceKm?: number | null;
  stockQuantity?: number | null;
  inStock?: boolean;
  unit?: string;
}

export function stockInfo(qty?: number | null, inStock?: boolean) {
  const tracked = typeof qty === 'number';
  const out = tracked ? (qty as number) <= 0 : inStock === false;
  const low = tracked && !out && (qty as number) <= 5;
  return { tracked, out, low, quantity: tracked ? (qty as number) : null };
}

/** Add-to-cart with the same sign-in gate as the web ProductCard. */
export function useAddToCart() {
  const { status } = useSession();
  const { add } = useCart();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const addProduct = async (productId: string, quantity = 1) => {
    if (status !== 'signedIn') {
      toast.show('Sign in to add items to your cart.', 'info');
      router.push('/login');
      return false;
    }
    setBusyId(productId);
    try {
      await add(productId, quantity);
      toast.show('Added to cart', 'success');
      return true;
    } catch (err) {
      toast.show(errorMessage(err, 'Could not add to cart.'), 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };
  return { addProduct, busyId };
}

/**
 * Grid product card — image with a temperature pill, name, vendor with the
 * verified tick, stock badge, then price + stars and a round cart button.
 */
export function ProductCard({ p, width, onAdd, adding }: { p: ProductCardData; width?: number; onAdd?: () => void; adding?: boolean }) {
  const { colors } = useTheme();
  const stock = stockInfo(p.stockQuantity, p.inStock);
  const rating = p.rating && p.rating > 0 ? p.rating : 4.1;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id, vendorId: p.vendorId ?? '' } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${formatMoney(p.price, p.market)}`}
      style={({ pressed }) => ({
        width,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: pressed ? colors.borderStrong : colors.border,
        borderRadius: radius.lg,
        overflow: 'hidden',
      })}
    >
      <View>
        <SmartImage uri={p.imageUrl} category={p.category} style={{ width: '100%', height: 140, borderBottomWidth: 1, borderBottomColor: colors.border }} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 }}>
          <Pill icon="snowflake" label={p.productType || 'Fresh'} />
        </View>
        {p.distanceKm != null ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Pill icon="location" label={`${p.distanceKm.toFixed(1)}km`} />
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12, gap: 4, flex: 1 }}>
        <Text weight="bold" size={15} color={colors.text} numberOfLines={1}>
          {p.name}
        </Text>
        {p.vendorName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {p.vendorName}
            </Text>
            <Glyph name="check-circle" size={13} color={colors.brand} />
          </View>
        ) : null}
        {stock.out ? <Badge label="Out of stock" tone="danger" /> : stock.low ? <Badge label={`Only ${stock.quantity} left`} tone="warning" /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 6 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="price" numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(p.price, p.market)}
            </Text>
            {p.unit ? <Text variant="caption">per {p.unit}</Text> : <Stars rating={rating} size={11} />}
          </View>
          {onAdd ? (
            <Pressable
              onPress={onAdd}
              disabled={stock.out || adding}
              accessibilityLabel={stock.out ? 'Out of stock' : 'Add to cart'}
              hitSlop={6}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.brand : colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: stock.out ? 0.45 : 1,
              })}
            >
              {({ pressed }) =>
                adding ? <ActivityIndicator size="small" color={colors.brand} /> : <Glyph name="cart-plus" size={19} color={pressed ? '#FFFFFF' : colors.text} />
              }
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Pill({ icon, label }: { icon: 'snowflake' | 'location'; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: radius.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Glyph name={icon} size={12} color={colors.body} />
      <Text size={11} weight="medium" color={colors.body} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Horizontal list row version (search results, store page "list" view). */
export function ProductRow({ p, onAdd, adding }: { p: ProductCardData; onAdd?: () => void; adding?: boolean }) {
  const { colors } = useTheme();
  const stock = stockInfo(p.stockQuantity, p.inStock);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id, vendorId: p.vendorId ?? '' } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: pressed ? colors.borderStrong : colors.border,
        borderRadius: radius.lg,
      })}
    >
      <SmartImage uri={p.imageUrl} category={p.category} style={{ width: 88, height: 88, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text weight="bold" size={15} color={colors.text} numberOfLines={2}>
          {p.name}
        </Text>
        {p.vendorName ? (
          <Text variant="caption" numberOfLines={1}>
            {p.vendorName}
          </Text>
        ) : null}
        {stock.out ? <Badge label="Out of stock" tone="danger" /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <Text variant="price">{formatMoney(p.price, p.market)}</Text>
          {onAdd ? (
            <Pressable
              onPress={onAdd}
              disabled={stock.out || adding}
              accessibilityLabel="Add to cart"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                height: 34,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.brand,
                backgroundColor: pressed ? colors.brandSoft : colors.surface,
                opacity: stock.out ? 0.5 : 1,
              })}
            >
              {adding ? <ActivityIndicator size="small" color={colors.brand} /> : <Glyph name="cart-plus" size={16} color={colors.brandText} />}
              <Text size={13} weight="semibold" color={colors.brandText}>
                {stock.out ? 'Out of stock' : 'Add'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
