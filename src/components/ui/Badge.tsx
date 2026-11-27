import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph, type GlyphName } from '@/components/icons/Glyph';
import { statusConfig, type Tone } from '@/lib/status';
import { radius, useTheme, type ThemeColors } from '@/theme';

import { Text } from './Text';

export function toneColors(tone: Tone, c: ThemeColors) {
  switch (tone) {
    case 'success':
      return { bg: c.successSoft, fg: c.successText, border: c.successSoft, dot: c.success };
    case 'warning':
      return { bg: c.warningSoft, fg: c.warningText, border: c.warningSoft, dot: c.warning };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.dangerText, border: c.dangerSoft, dot: c.danger };
    case 'brand':
      return { bg: c.brandSoft, fg: c.brandText, border: c.brandSoft, dot: c.brand };
    case 'verified':
      return { bg: c.verifiedSoft, fg: c.verifiedText, border: c.verifiedSoft, dot: c.verified };
    default:
      return { bg: c.mutedStrong, fg: c.body, border: c.border, dot: c.placeholder };
  }
}

/** Small rounded-md label. Status colour lives only inside badges (DESIGN.md §2). */
export function Badge({ label, tone = 'neutral', icon, dot, style }: { label: string; tone?: Tone; icon?: GlyphName; dot?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const t = toneColors(tone, colors);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.sm,
          backgroundColor: t.bg,
          borderWidth: 1,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.dot }} /> : null}
      {icon ? <Glyph name={icon} size={12} color={t.fg} /> : null}
      <Text size={11} weight="medium" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** <StatusBadge status="pending_payment" /> — same labels as the web StatusBadge. */
export function StatusBadge({ status, kind, label, style }: { status: string | boolean | null | undefined; kind?: 'order' | 'auto'; label?: string; style?: StyleProp<ViewStyle> }) {
  const cfg = statusConfig(status, kind);
  return <Badge label={label ?? cfg.label} tone={cfg.tone} dot style={style} />;
}

/**
 * The Sales CRM tab strip (DESIGN.md §6 FilterTabs): tabs joined in one
 * bordered strip, dividers between; selected tab primary-50 with a 3px
 * orange underline; scrolls sideways on phones.
 */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  style,
}: {
  tabs: { value: T; label: string; count?: number | null }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          flexGrow: 1,
        }}
      >
        {tabs.map((t, i) => {
          const active = t.value === value;
          return (
            <Pressable
              key={t.value}
              onPress={() => onChange(t.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flexGrow: 1,
                height: 38,
                paddingHorizontal: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: active ? colors.brandSoft : colors.surface,
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: colors.border,
                borderBottomWidth: 3,
                borderBottomColor: active ? colors.brand : 'transparent',
              }}
            >
              <Text size={13} weight={active ? 'semibold' : 'medium'} color={active ? colors.text : colors.textSecondary} numberOfLines={1}>
                {t.label}
              </Text>
              {t.count != null ? (
                <Text size={11} weight="medium" color={active ? colors.brandText : colors.textMuted}>
                  {t.count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** Selectable chip (filters, categories). */
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: GlyphName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? colors.brand : colors.border,
        backgroundColor: active ? colors.brandSoft : pressed ? colors.muted : colors.surface,
      })}
    >
      {icon ? <Glyph name={icon} size={14} color={active ? colors.brandText : colors.textSecondary} /> : null}
      <Text size={13} weight="medium" color={active ? colors.brandText : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}
