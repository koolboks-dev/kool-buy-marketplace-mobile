import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ILLUSTRATIONS, type IllustrationName } from '@/lib/brand-svg';
import { radius, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

/** A brand illustration from the web's public/brand/illustrations. */
export function Illustration({ name, size = 180 }: { name: IllustrationName; size?: number }) {
  return <SvgXml xml={ILLUSTRATIONS[name]} width={size} height={size * 0.75} />;
}

/**
 * Every empty state uses an illustration, centred (DESIGN.md §6).
 */
export function EmptyState({
  title,
  description,
  illustration = 'no-results',
  action,
  onAction,
  compact,
  children,
}: {
  title: string;
  description?: string;
  illustration?: IllustrationName;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 16 : 32, paddingHorizontal: 16, gap: 8 }}>
      <Illustration name={illustration} size={compact ? 140 : 180} />
      <Text variant="subtitle" align="center" style={{ marginTop: 4 }}>
        {title}
      </Text>
      {description ? (
        <Text variant="secondary" align="center" style={{ maxWidth: 320 }}>
          {description}
        </Text>
      ) : null}
      {action ? <Button label={action} onPress={onAction} variant="ink" style={{ marginTop: 8 }} /> : null}
      {children}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      illustration={/network|internet|reach|offline|timed out/i.test(message) ? 'offline' : 'error'}
      title="Something went wrong"
      description={message}
      action={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}

export function Loader({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 10 }, style]}>
      <ActivityIndicator color={colors.brand} />
      {label ? <Text variant="caption">{label}</Text> : null}
    </View>
  );
}

/** Pulsing grey block. */
export function Skeleton({ width = '100%', height = 14, r = radius.sm, style }: { width?: DimensionValue; height?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [v] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.mutedStrong, opacity: v }, style]} />;
}

/** A list of card skeletons while a page loads. */
export function ListSkeleton({ rows = 5, height = 76 }: { rows?: number; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ height, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, gap: 8 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={11} />
        </View>
      ))}
    </View>
  );
}

/** Thin progress bar (orange). */
export function ProgressBar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[{ height: 6, borderRadius: 3, backgroundColor: colors.mutedStrong, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.brand, borderRadius: 3 }} />
    </View>
  );
}
