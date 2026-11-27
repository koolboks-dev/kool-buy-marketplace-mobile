import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Badge, Glyph, SmartImage, Stars, Text } from '@/components/ui';
import type { Vendor } from '@/services/types';
import { radius, useTheme } from '@/theme';

/** Store card: cover, logo, name with verified tick, location, rating, product count. */
export function VendorCard({ v, width }: { v: Vendor; width?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: v.id } })}
      accessibilityRole="button"
      accessibilityLabel={v.name}
      style={({ pressed }) => ({
        width,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: pressed ? colors.borderStrong : colors.border,
        borderRadius: radius.lg,
        overflow: 'hidden',
      })}
    >
      <SmartImage uri={v.cover_image_url || v.image_url} category="produce" style={{ width: '100%', height: 96 }} />
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, marginTop: -22, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ borderWidth: 3, borderColor: colors.surface, borderRadius: 26 }}>
            <Avatar uri={v.image_url} name={v.name} size={44} />
          </View>
          {v.distance_km != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 }}>
              <Glyph name="location" size={12} color={colors.textMuted} />
              <Text variant="caption">{Number(v.distance_km).toFixed(1)}km</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text weight="bold" size={15} color={colors.text} numberOfLines={1} style={{ flexShrink: 1 }}>
            {v.name}
          </Text>
          <Glyph name="check-circle" size={14} color={colors.brand} />
        </View>
        {v.location_label || v.address ? (
          <Text variant="caption" numberOfLines={1}>
            {v.location_label || v.address}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <Stars rating={v.rating || 0} size={11} count={v.review_count} />
          {v.is_cold_chain_verified ? <Badge label="Cold-chain" tone="verified" icon="snowflake" /> : null}
        </View>
        {v.products_count != null ? <Text variant="caption">{v.products_count} products</Text> : null}
      </View>
    </Pressable>
  );
}

/** Compact store row (search results, saved stores). */
export function VendorRow({ v, right }: { v: Pick<Vendor, 'id' | 'name' | 'image_url' | 'location_label' | 'address' | 'rating' | 'review_count'>; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: v.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: pressed ? colors.borderStrong : colors.border,
        borderRadius: radius.lg,
      })}
    >
      <Avatar uri={v.image_url} name={v.name} size={46} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" color={colors.text} numberOfLines={1}>
          {v.name}
        </Text>
        {v.location_label || v.address ? (
          <Text variant="caption" numberOfLines={1}>
            {v.location_label || v.address}
          </Text>
        ) : null}
        <Stars rating={v.rating || 0} size={11} count={v.review_count} />
      </View>
      {right ?? <Glyph name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}
