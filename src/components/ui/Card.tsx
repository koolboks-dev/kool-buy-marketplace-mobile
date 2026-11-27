import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph, type GlyphName } from '@/components/icons/Glyph';
import { radius, useTheme } from '@/theme';

import { Text } from './Text';

/** The card (DESIGN.md §4): white, 1px ash-200 border, 12px radius, no resting shadow. */
export function Card({
  children,
  style,
  padding = 16,
  onPress,
  muted,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: muted ? colors.muted : colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, pressed && { borderColor: colors.borderStrong, backgroundColor: colors.muted }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** Inner well: ash-50 fill inside a card (summaries, info blocks). */
export function Well({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 }, style]}>{children}</View>
  );
}

export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border, marginLeft: inset }, style]} />;
}

/** Section title row: "Popular near you" + optional action link. */
export function SectionHeader({ title, subtitle, action, onAction, style }: { title: string; subtitle?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, style]}>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        {subtitle ? (
          <Text variant="caption" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text variant="link" size={13}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Label / value line used in detail screens. */
export function InfoRow({ label, value, valueColor, icon, last }: { label: string; value?: ReactNode; valueColor?: string; icon?: GlyphName; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, maxWidth: '45%' }}>
        {icon ? <Glyph name={icon} size={16} color={colors.textMuted} /> : null}
        <Text variant="secondary" size={13}>
          {label}
        </Text>
      </View>
      {typeof value === 'string' || typeof value === 'number' || value == null ? (
        <Text weight="medium" size={13} color={valueColor ?? colors.text} align="right" style={{ flex: 1 }} selectable>
          {value == null || value === '' ? '—' : String(value)}
        </Text>
      ) : (
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{value}</View>
      )}
    </View>
  );
}

/** Tappable menu row: icon chip, title, subtitle, chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  last,
  danger,
}: {
  icon?: GlyphName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: pressed ? colors.muted : 'transparent',
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: danger ? colors.dangerSoft : colors.muted,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Glyph name={icon} size={18} color={danger ? colors.danger : colors.text} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium" size={14} color={danger ? colors.danger : colors.text} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Glyph name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}
