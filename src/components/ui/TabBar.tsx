import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcons, type TabIconName } from '@/components/icons/TabIcons';
import { font, useTheme } from '@/theme';

import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

/**
 * A port of the Kool Logistics floating glass tab bar
 * (kool-logistics_mobile/src/components/ui/TabBar.tsx) — same geometry,
 * spring, haptic, colours and badge.
 */

export interface TabItem {
  key: string;
  label: string;
  icon: TabIconName;
  badge?: number;
}

/** Kool Logistics tokens used by the bar. */
const Spacing = { xs: 4, md: 12, base: 16 };
const Radius = { xxl: 20, pill: 999 };
const FontSize = { xs: 11 };
const Motion = { fast: 140, spring: { damping: 18, stiffness: 190, mass: 0.9 } };

/** Space the floating bar covers above the safe area (bar + its padding). */
export const TAB_BAR_SPACE = 72;

/** Every press fires a light impact, and the icon does a quick scale pop so the tap feels acknowledged on both platforms. */
export function TabBar({ tabs, value, onChange }: { tabs: TabItem[]; value: string; onChange: (key: string) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]} pointerEvents="box-none">
      <GlassSurface radius={Radius.xxl} style={styles.bar}>
        {tabs.map((t) => (
          <TabButton
            key={t.key}
            tab={t}
            active={t.key === value}
            onPress={() => {
              if (t.key !== value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(t.key);
            }}
          />
        ))}
      </GlassSurface>
    </View>
  );
}

function TabButton({ tab, active, onPress }: { tab: TabItem; active: boolean; onPress: () => void }) {
  const { colors, mode } = useTheme();
  const Icon = TabIcons[tab.icon];
  const scale = useSharedValue(1);
  const lift = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(active ? 1 : 0, Motion.spring);
    if (active) {
      scale.value = withSequence(withSpring(1.18, { damping: 10, stiffness: 260 }), withSpring(1, Motion.spring));
    }
  }, [active, lift, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -lift.value * 2 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.6, { duration: Motion.fast }),
  }));

  // Kool Logistics colours: brand orange when active, grey600 / grey400 (dark) otherwise.
  const inactive = mode === 'dark' ? '#ADB5BD' : '#495057';
  const tint = active ? colors.brand : inactive;

  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label}>
      <View>
        <Animated.View style={iconStyle}>
          <Icon size={24} color={tint} active={active} />
        </Animated.View>
        {!!tab.badge && (
          <View style={styles.badge}>
            <Badge count={tab.badge} />
          </View>
        )}
      </View>

      <Animated.View style={labelStyle}>
        <Text
          numberOfLines={1}
          style={{
            color: tint,
            fontFamily: active ? font.semibold : font.medium,
            fontSize: FontSize.xs,
            lineHeight: 14,
          }}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** The Kool Logistics count badge (red pill). */
function Badge({ count, max = 99 }: { count: number; max?: number }) {
  const { mode } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: Radius.pill,
        backgroundColor: mode === 'dark' ? '#F0707D' : '#DC3545',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 10 }}>{count > max ? `${max}+` : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.base,
  },
  bar: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', gap: Spacing.xs, paddingVertical: 0 },
  badge: { position: 'absolute', top: -4, right: -8 },
});
