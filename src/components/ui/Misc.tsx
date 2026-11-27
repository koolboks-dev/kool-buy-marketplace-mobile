import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, Switch as RNSwitch, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Glyph, StarIcon } from '@/components/icons/Glyph';
import { CATEGORY_ART, LOGO_SVG, type CategoryArtName } from '@/lib/brand-svg';
import { initials } from '@/lib/format';
import { radius, useTheme } from '@/theme';

import { Text } from './Text';

/** The KoolBuy Marketplace logo (public/icons/koolmarket.svg). Dark mode swaps the brown wordmark for white. */
export function Logo({ height = 26 }: { height?: number }) {
  const { mode } = useTheme();
  const xml = useMemo(() => (mode === 'dark' ? LOGO_SVG.replace(/#421708/gi, '#FFFFFF') : LOGO_SVG), [mode]);
  return <SvgXml xml={xml} height={height} width={(height * 255) / 46} />;
}

const CATEGORY_MAP: Record<string, CategoryArtName> = {
  fish_seafood: 'fish',
  fresh_meats: 'meat',
  poultry: 'poultry',
  frozen_foods: 'ice',
  ice_blocks: 'ice',
  fresh_vegetables: 'produce',
  fresh_fruits: 'produce',
  dairy_eggs: 'dairy',
  grains_provisions: 'grains',
  beverages: 'beverages',
  spices_seasonings: 'grains',
};

export function categoryArt(slug?: string | null): CategoryArtName {
  const s = String(slug ?? '').toLowerCase();
  if (CATEGORY_MAP[s]) return CATEGORY_MAP[s];
  if (s.includes('fish') || s.includes('sea')) return 'fish';
  if (s.includes('meat') || s.includes('beef')) return 'meat';
  if (s.includes('chicken') || s.includes('poultry')) return 'poultry';
  if (s.includes('ice') || s.includes('frozen')) return 'ice';
  if (s.includes('dairy') || s.includes('milk') || s.includes('egg')) return 'dairy';
  if (s.includes('drink') || s.includes('bever')) return 'beverages';
  if (s.includes('grain') || s.includes('rice')) return 'grains';
  return 'produce';
}

export function CategoryArt({ slug, size = 40 }: { slug?: string | null; size?: number }) {
  return <SvgXml xml={CATEGORY_ART[categoryArt(slug)]} width={size} height={size} />;
}

/**
 * Remote image with the web SmartImage behaviour: a category-art placeholder
 * on a soft well when the URL is missing or fails.
 */
export function SmartImage({
  uri,
  category,
  style,
  contentFit = 'cover',
}: {
  uri?: string | null;
  category?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const ok = Boolean(uri) && !failed && /^https?:\/\//.test(String(uri));
  return (
    <View style={[{ backgroundColor: colors.muted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {ok ? (
        <Image source={{ uri: uri as string }} style={{ width: '100%', height: '100%' }} contentFit={contentFit} transition={150} onError={() => setFailed(true)} />
      ) : (
        <CategoryArt slug={category} size={44} />
      )}
    </View>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandSoft,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailed(true)} />
      ) : (
        <Text weight="semibold" size={Math.round(size * 0.38)} color={colors.brandText}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export function Stars({ rating = 0, size = 13, showValue = true, count }: { rating?: number; size?: number; showValue?: boolean; count?: number }) {
  const { colors } = useTheme();
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} size={size} empty={i >= Math.round(r)} emptyColor={colors.borderStrong} />
      ))}
      {showValue ? (
        <Text variant="caption" weight="medium" style={{ marginLeft: 4 }}>
          ({r.toFixed(1)}){count != null ? ` · ${count}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

/** − 2 + stepper. */
export function QuantityStepper({ value, onChange, min = 0, max, disabled, size = 'md' }: { value: number; onChange: (v: number) => void; min?: number; max?: number | null; disabled?: boolean; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const h = size === 'sm' ? 32 : 40;
  const btn = (icon: 'minus' | 'plus', next: number, can: boolean) => (
    <Pressable
      onPress={() => can && onChange(next)}
      disabled={!can || disabled}
      accessibilityLabel={icon === 'plus' ? 'Increase quantity' : 'Decrease quantity'}
      style={({ pressed }) => ({ width: h, height: h, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.mutedStrong : 'transparent', opacity: can && !disabled ? 1 : 0.4 })}
    >
      <Glyph name={icon} size={16} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
      {btn('minus', value - 1, value > min)}
      <Text weight="semibold" style={{ minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {btn('plus', value + 1, max == null || value < max)}
    </View>
  );
}

export function Switch({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.borderStrong, true: colors.brand }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.borderStrong}
    />
  );
}

export function SwitchRow({ label, description, value, onValueChange, disabled, last }: { label: string; description?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1 }}>
        <Text weight="medium" color={colors.text}>
          {label}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

/** A row of options as joined segments (period switch 7/30/90 days). */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.mutedStrong, borderRadius: radius.md, padding: 3, alignSelf: 'flex-start' }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ paddingHorizontal: 12, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.surface : 'transparent' }}
          >
            <Text size={12} weight={active ? 'semibold' : 'medium'} color={active ? colors.text : colors.textSecondary}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pick one option from a list, shown as a vertical radio list. */
export function RadioList<T extends string>({ options, value, onChange }: { options: { value: T; label: string; description?: string }[]; value: T | null; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: active ? colors.brand : colors.border,
              backgroundColor: active ? colors.brandSoft : colors.surface,
            }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? colors.brand : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="medium" color={colors.text}>
                {o.label}
              </Text>
              {o.description ? <Text variant="caption">{o.description}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
