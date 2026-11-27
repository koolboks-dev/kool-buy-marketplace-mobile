import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroCarousel } from '@/components/marketplace/HeroCarousel';
import { ProductCard, useAddToCart } from '@/components/marketplace/ProductCard';
import { VendorCard } from '@/components/marketplace/VendorCard';
import { Button, CategoryArt, Card, EmptyState, Glyph, IconButton, Logo, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { getNotifications } from '@/services/buyer';
import {
  getHomepageOffers,
  listHeroBanners,
  listHomepageStats,
  listPopularCategories,
  listVendors,
  searchProducts,
} from '@/services/catalog';
import { useSession } from '@/store/session';
import { TAB_BAR_SPACE } from '@/components/ui/TabBar';
import { radius, useLayout, useTheme } from '@/theme';

/** "Why Choose Us?" — the approved exception: each card keeps its own colour (DESIGN.md §2). */
const WHY = [
  { title: 'Simplified Sourcing', tagline: 'One request connects you to verified bulk suppliers across Africa.', bg: '#FFF4EC', accent: '#F57D1C', icon: 'bag' as const },
  { title: 'Verified Vendors', tagline: 'Physically audited warehouses, CAC & NAFDAC verified partners.', bg: '#ECFDF5', accent: '#10B981', icon: 'shield' as const },
  { title: 'Smart Matching', tagline: 'AI routes your order to the nearest cold-storage node to save costs.', bg: '#FEF9C3', accent: '#CA8A04', icon: 'location' as const },
  { title: 'Clear Communication', tagline: 'Milestone tracking, direct chat, and escrow payment protection.', bg: '#EFF6FF', accent: '#2563EB', icon: 'chat' as const },
];

const FALLBACK_CATEGORIES = [
  { id: 'fish', title: 'Fish & Seafood', category_slug: 'fish_seafood' },
  { id: 'meat', title: 'Fresh Meats', category_slug: 'fresh_meats' },
  { id: 'poultry', title: 'Poultry', category_slug: 'poultry' },
  { id: 'frozen', title: 'Frozen Foods', category_slug: 'frozen_foods' },
  { id: 'dairy', title: 'Dairy & Eggs', category_slug: 'dairy_eggs' },
  { id: 'veg', title: 'Vegetables', category_slug: 'fresh_vegetables' },
  { id: 'drinks', title: 'Beverages', category_slug: 'beverages' },
  { id: 'grains', title: 'Grains', category_slug: 'grains_provisions' },
];

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter, contentWidth, columns } = useLayout();
  const { user, status } = useSession();
  const { addProduct, busyId } = useAddToCart();
  const [refreshing, setRefreshing] = useState(false);

  const banners = useAsync(() => listHeroBanners().then((r) => r.items ?? []), []);
  const stats = useAsync(() => listHomepageStats().then((r) => (r.items ?? []).filter((s) => s.is_active !== false)), []);
  const offers = useAsync(() => getHomepageOffers(), []);
  const cats = useAsync(() => listPopularCategories().then((r) => (r.items ?? []).filter((c) => c.is_active !== false)), []);
  const products = useAsync(() => searchProducts({ page: 1, page_size: 12, sort: 'popular', market: user?.market }).then((r) => r.items ?? []), [user?.market]);
  const vendors = useAsync(() => listVendors({ page: 1, page_size: 10, market: user?.market }), [user?.market]);
  const unread = useAsync(() => getNotifications(1, 1).then((r) => r.unread_count ?? 0), [status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([banners.reload(), stats.reload(), offers.reload(), cats.reload(), products.reload(), vendors.reload(), unread.reload()]);
    setRefreshing(false);
  }, [banners, stats, offers, cats, products, vendors, unread]);

  const inner = contentWidth - gutter * 2;
  const cols = columns(160);
  const cardW = (inner - 12 * (cols - 1)) / cols;
  const offerItems = offers.data?.items ?? [];
  const categoryCards = (cats.data && cats.data.length ? cats.data : FALLBACK_CATEGORIES) as { id: string; title: string; category_slug: string; image_url?: string }[];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top bar: logo, search, notifications (web TopBar on mobile) */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo height={24} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {status === 'signedIn' ? <IconButton icon="bell" label="Notifications" size={38} badge={unread.data ?? 0} onPress={() => router.push('/notifications')} /> : null}
            {status !== 'signedIn' ? <Button label="Sign in" size="sm" variant="outline" onPress={() => router.push('/login')} /> : null}
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          style={{ height: 42, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}
        >
          <Glyph name="search" size={18} color={colors.textMuted} />
          <Text color={colors.placeholder} size={15}>
            Search fish, chicken, ice blocks…
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        <View style={{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: gutter, paddingTop: 16, gap: 28 }}>
          {/* Hero */}
          {banners.loading ? <Skeleton height={240} r={radius.xl} /> : <HeroCarousel banners={banners.data ?? []} width={inner} />}

          {/* Stats strip */}
          {stats.data && stats.data.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {stats.data.map((s) => (
                <Card key={s.id} padding={14} style={{ flexGrow: 1, flexBasis: (inner - 10) / 2 - 1, minWidth: 140 }}>
                  <Text variant="title" size={22}>
                    {s.prefix}
                    {Number(s.target).toLocaleString(undefined, { maximumFractionDigits: s.decimals ?? 0 })}
                    {s.suffix}
                  </Text>
                  <Text weight="semibold" size={13} color={colors.text}>
                    {s.label}
                  </Text>
                  {s.subtext ? <Text variant="caption">{s.subtext}</Text> : null}
                </Card>
              ))}
            </View>
          ) : null}

          {/* Offers */}
          {offerItems.length > 0 ? (
            <View style={{ gap: 12 }}>
              <SectionHeader title={offers.data?.heading || 'Choose how you want to start'} subtitle={offers.data?.footnote || undefined} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {offerItems.map((o) => (
                  <Card key={o.id} padding={0} style={{ width: Math.min(300, inner * 0.82), overflow: 'hidden', borderColor: o.is_highlighted ? colors.brand : colors.border }}>
                    {o.image_url ? <Image source={{ uri: o.image_url }} style={{ width: '100%', height: 120 }} contentFit="cover" /> : null}
                    <View style={{ padding: 14, gap: 6 }}>
                      <Text variant="subtitle">{o.title}</Text>
                      {o.tagline ? <Text variant="secondary" size={13}>{o.tagline}</Text> : null}
                      {(o.points ?? []).slice(0, 4).map((pt) => (
                        <View key={pt} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                          <Glyph name="check" size={14} color={colors.brand} />
                          <Text size={13} style={{ flex: 1 }}>
                            {pt}
                          </Text>
                        </View>
                      ))}
                      <Button
                        label={o.button_label || `Choose ${o.title}`}
                        variant="outline"
                        size="sm"
                        style={{ marginTop: 6 }}
                        onPress={() => (o.link_url && /^https?:/.test(o.link_url) ? Linking.openURL(o.link_url) : router.push('/(tabs)/browse'))}
                      />
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Popular categories */}
          <View style={{ gap: 12 }}>
            <SectionHeader title="Popular categories" action="See all" onAction={() => router.push('/search')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {categoryCards.slice(0, 8).map((c) => {
                const w = (inner - 10 * (Math.max(4, cols + 1) - 1)) / Math.max(4, cols + 1);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push({ pathname: '/search', params: { category: c.category_slug } })}
                    accessibilityRole="button"
                    accessibilityLabel={c.title}
                    style={({ pressed }) => ({
                      width: w,
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: pressed ? colors.brand : colors.border,
                      backgroundColor: colors.surface,
                    })}
                  >
                    {c.image_url ? (
                      <Image source={{ uri: c.image_url }} style={{ width: 40, height: 40, borderRadius: 8 }} contentFit="cover" />
                    ) : (
                      <CategoryArt slug={c.category_slug} size={40} />
                    )}
                    <Text size={11} weight="medium" align="center" numberOfLines={2} color={colors.text}>
                      {c.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Shop the marketplace */}
          <View style={{ gap: 12 }}>
            <SectionHeader title="Shop KoolBuy Marketplace" subtitle="Fresh and frozen stock from verified vendors" action="See all" onAction={() => router.push('/search')} />
            {products.loading ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width={cardW} height={240} r={radius.lg} />
                <Skeleton width={cardW} height={240} r={radius.lg} />
              </View>
            ) : (products.data ?? []).length === 0 ? (
              <Card>
                <EmptyState compact illustration="no-results" title="No products here yet" description="Vendors are adding stock — check back soon." />
              </Card>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {(products.data ?? []).slice(0, cols * 3).map((p) => (
                  <ProductCard
                    key={p.id}
                    width={cardW}
                    p={{
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
                    }}
                    adding={busyId === p.id}
                    onAdd={() => addProduct(p.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Why choose us */}
          <View style={{ gap: 12 }}>
            <SectionHeader title="Why choose us?" subtitle="Verified Marketplace Standard" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {WHY.map((w) => (
                <View
                  key={w.title}
                  style={{ flexGrow: 1, flexBasis: cols > 2 ? (inner - 30) / 4 : inner, minWidth: 150, backgroundColor: mode === 'dark' ? colors.surface : w.bg, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: mode === 'dark' ? colors.border : 'transparent' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph name={w.icon} size={18} color={w.accent} />
                  </View>
                  <Text variant="subtitle">{w.title}</Text>
                  <Text variant="secondary" size={13}>
                    {w.tagline}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Popular stores */}
          <View style={{ gap: 12 }}>
            <SectionHeader title="Popular stores" subtitle={user?.market ? undefined : 'Stores across KoolBuy Marketplace'} action="Browse" onAction={() => router.push('/(tabs)/browse')} />
            {vendors.loading ? (
              <Skeleton height={190} r={radius.lg} />
            ) : (vendors.data ?? []).length === 0 ? (
              <Card>
                <EmptyState compact illustration="no-vendors" title="No stores found yet" />
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {(vendors.data ?? []).map((v) => (
                  <VendorCard key={v.id} v={v} width={Math.min(240, inner * 0.7)} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Get started (signed-out only) */}
          {status !== 'signedIn' ? (
            <Card padding={20} style={{ alignItems: 'center', gap: 10 }}>
              <Text variant="title" align="center">
                Get started for free today
              </Text>
              <Text variant="secondary" align="center">
                Join the AI-Powered Vendor to Buyer Market Space
              </Text>
              <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 6 }}>
                <Button label="Join as a vendor" variant="primary" full onPress={() => router.push({ pathname: '/signup', params: { role: 'retailer' } })} />
                <Button label="Explore Marketplace" variant="outline" iconRight="arrow-forward" full onPress={() => router.push('/(tabs)/browse')} />
              </View>
            </Card>
          ) : null}

          <Text variant="caption" align="center">
            KoolBuy Marketplace by Koolboks
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
