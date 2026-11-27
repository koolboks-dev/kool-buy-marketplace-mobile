import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph, type GlyphName } from '@/components/icons/Glyph';
import { radius, useTheme } from '@/theme';

import { Text } from './Text';

/**
 * DESIGN.md §6 buttons:
 * primary  — orange fill, the ONE key CTA per view (Add to cart, Checkout)
 * ink      — charcoal fill, primary action in dashboards and forms (Save)
 * outline  — white, 1px border, charcoal text (secondary)
 * secondary— ash-100 fill (tertiary)
 * ghost    — transparent (toolbar)
 * destructive — ember fill
 * Default height 44 (touch target), 12px radius. No pills.
 */
export type ButtonVariant = 'primary' | 'ink' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'brandOutline';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: GlyphName;
  iconRight?: GlyphName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'ink', size = 'md', icon, iconRight, loading, disabled, full, style, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const height = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const fontSize = size === 'sm' ? 13 : 15;

  const look: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
    primary: { bg: colors.brand, pressed: colors.brandPressed, fg: '#FFFFFF' },
    ink: { bg: colors.ink, pressed: colors.textSecondary, fg: colors.onInk },
    outline: { bg: colors.surface, pressed: colors.mutedStrong, fg: colors.text, border: colors.border },
    brandOutline: { bg: colors.surface, pressed: colors.brandSoft, fg: colors.brandText, border: colors.brand },
    secondary: { bg: colors.mutedStrong, pressed: colors.border, fg: colors.text },
    ghost: { bg: 'transparent', pressed: colors.mutedStrong, fg: colors.text },
    destructive: { bg: colors.danger, pressed: '#C82333', fg: '#FFFFFF' },
  };
  const l = look[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? 12 : 16,
          borderRadius: radius.lg,
          backgroundColor: pressed ? l.pressed : l.bg,
          borderWidth: l.border ? 1 : 0,
          borderColor: l.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={l.fg} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Glyph name={icon} size={size === 'sm' ? 16 : 18} color={l.fg} /> : null}
          <Text weight="semibold" size={fontSize} color={l.fg} numberOfLines={1}>
            {label}
          </Text>
          {iconRight ? <Glyph name={iconRight} size={size === 'sm' ? 16 : 18} color={l.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

/** Round icon-only button (the one place rounded-full is allowed). */
export function IconButton({
  icon,
  onPress,
  label,
  size = 40,
  tone = 'surface',
  badge,
  color,
}: {
  icon: GlyphName;
  onPress?: () => void;
  label: string;
  size?: number;
  tone?: 'surface' | 'ghost' | 'brand';
  badge?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const bg = tone === 'brand' ? colors.brand : tone === 'ghost' ? 'transparent' : colors.surface;
  const fg = color ?? (tone === 'brand' ? '#FFFFFF' : colors.text);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? colors.mutedStrong : bg,
        borderWidth: tone === 'surface' ? 1 : 0,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Glyph name={icon} size={Math.round(size * 0.5)} color={fg} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text size={10} weight="bold" color="#FFFFFF">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
