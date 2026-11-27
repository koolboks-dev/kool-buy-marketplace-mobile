import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Glyph,
  ListSkeleton,
  QuantityStepper,
  Screen,
  SmartImage,
  Text,
  useToast,
  Well,
} from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { formatMoney, parseMoney } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

/** The cart, grouped by store (web CartWithItems / CartMobileView). */
export default function CartScreen() {
  const { colors } = useTheme();
  const { status } = useSession();
  const { cart, loading, reload, setQuantity, remove } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const vendors = cart?.vendors ?? [];
  const market = vendors[0]?.market;
  const subtotal = cart?.total_cost ?? vendors.reduce((s, v) => s + parseMoney(v.subtotal), 0);
  const shipping = cart?.shipping_total ?? 0;
  const total = cart?.grand_total ?? subtotal + shipping;
  const minimum = cart?.minimum;

  const change = async (productId: string, qty: number) => {
    setBusy(productId);
    try {
      if (qty <= 0) await remove(productId);
      else await setQuantity(productId, qty);
    } catch (err) {
      toast.show(errorMessage(err, 'Could not update the cart.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (status !== 'signedIn') {
    return (
      <Screen title="Cart" back={false} tabBar>
        <EmptyState illustration="empty-cart" title="Sign in to see your cart" description="Your cart is saved to your account so it follows you on every device." action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Cart"
      subtitle={vendors.length ? `${vendors.length} ${vendors.length === 1 ? 'store' : 'stores'}` : undefined}
      back={false}
      tabBar
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await reload();
        setRefreshing(false);
      }}
      footer={
        vendors.length ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="secondary">Total</Text>
              <Text variant="price" size={20}>
                {formatMoney(total, market)}
              </Text>
            </View>
            <Button label="Checkout" variant="primary" size="lg" iconRight="arrow-forward" full disabled={minimum ? !minimum.met : false} onPress={() => router.push('/checkout')} />
          </View>
        ) : undefined
      }
    >
      {loading && !cart ? (
        <ListSkeleton rows={3} height={130} />
      ) : vendors.length === 0 ? (
        <EmptyState illustration="empty-cart" title="Your cart is empty" description="Browse fresh and frozen stock from verified vendors." action="Start shopping" onAction={() => router.push('/(tabs)/browse')} />
      ) : (
        <>
          {cart?.price_changes?.length ? (
            <Well>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Glyph name="info" size={18} color={colors.warning} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold" color={colors.text}>
                    Some prices changed
                  </Text>
                  {cart.price_changes.map((c) => (
                    <Text key={c.product_id} variant="caption">
                      {c.name}: {formatMoney(c.old_price, market)} → {formatMoney(c.new_price, market)}
                    </Text>
                  ))}
                </View>
              </View>
            </Well>
          ) : null}

          {minimum && !minimum.met ? (
            <Well>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Glyph name="warning" size={18} color={colors.warning} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold" color={colors.text}>
                    Minimum order not reached
                  </Text>
                  <Text variant="caption">{minimum.message ?? minimum.stores.find((s) => !s.met)?.message}</Text>
                </View>
              </View>
            </Well>
          ) : null}

          {vendors.map((v) => (
            <Card key={v.id} padding={0}>
              <Pressable
                onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: v.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Avatar uri={v.image_url} name={v.name} size={32} />
                <Text weight="semibold" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
                  {v.name}
                </Text>
                <Glyph name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              {v.items.map((item, i) => (
                <View key={item.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <SmartImage uri={item.image_url} style={{ width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text weight="semibold" color={colors.text} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text variant="caption">{formatMoney(item.unit_price, v.market)} each</Text>
                    {item.price_changed ? <Badge label="Price changed" tone="warning" /> : null}
                    {item.in_stock === false ? <Badge label="Out of stock" tone="danger" /> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <QuantityStepper size="sm" value={item.quantity} onChange={(n) => change(item.product_id, n)} max={item.stock_quantity ?? undefined} disabled={busy === item.product_id} />
                      <Pressable onPress={() => change(item.product_id, 0)} hitSlop={8} accessibilityLabel={`Remove ${item.name}`}>
                        <Glyph name="trash" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                  <Text variant="price" size={14}>
                    {formatMoney(item.subtotal, v.market)}
                  </Text>
                </View>
              ))}
              <Divider />
              <View style={{ padding: 14, gap: 4 }}>
                <Row label="Subtotal" value={formatMoney(v.subtotal, v.market)} />
                {v.shipping_fee ? <Row label="Shipping" value={formatMoney(v.shipping_fee, v.market)} /> : <Row label="Shipping" value="Free" />}
              </View>
            </Card>
          ))}

          <Card style={{ gap: 6 }}>
            <Text variant="subtitle">Order summary</Text>
            <Row label="Items" value={formatMoney(subtotal, market)} />
            <Row label="Shipping" value={shipping ? formatMoney(shipping, market) : 'Free'} />
            <Divider style={{ marginVertical: 4 }} />
            <Row label="Total" value={formatMoney(total, market)} strong />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'subtitle' : 'secondary'}>{label}</Text>
      <Text weight={strong ? 'bold' : 'medium'} color={colors.text}>
        {value}
      </Text>
    </View>
  );
}
