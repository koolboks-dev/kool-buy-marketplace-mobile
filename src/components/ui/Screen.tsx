import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout, useTheme } from '@/theme';

import { TAB_BAR_SPACE } from './TabBar';

import { IconButton } from './Button';
import { Text } from './Text';

export function goBack(fallback = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

/**
 * The top bar: back button, title + subtitle (the web's PageHeading
 * "heading / subheading" pair), and actions on the right. White with a 1px
 * bottom border, like the web TopBar.
 */
export function AppHeader({
  title,
  subtitle,
  back = true,
  right,
  left,
  backFallback,
  transparent,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  left?: ReactNode;
  backFallback?: string;
  transparent?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: gutter,
        backgroundColor: transparent ? 'transparent' : colors.surface,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {left ?? (back ? <IconButton icon="arrow-back" label="Back" size={38} onPress={() => goBack(backFallback)} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <Text variant="subtitle" size={17} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

interface ScreenProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  backFallback?: string;
  headerRight?: ReactNode;
  header?: ReactNode | null;
  children: ReactNode;
  /** Sticky bottom bar (checkout button, save). */
  footer?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom space for the tab bar. */
  tabBar?: boolean;
  /** Narrow column for forms (max 640). */
  narrow?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  background?: string;
}

export function Screen({
  title,
  subtitle,
  back = true,
  backFallback,
  headerRight,
  header,
  children,
  footer,
  scroll = true,
  refreshing,
  onRefresh,
  tabBar,
  narrow,
  padded = true,
  contentStyle,
  scrollProps,
  background,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter, isWide } = useLayout();
  const maxWidth = narrow ? 640 : isWide ? 1200 : undefined;
  const tabSpace = Math.max(insets.bottom, 12) + TAB_BAR_SPACE;
  const bottomPad = footer ? 16 : tabBar ? tabSpace + 8 : insets.bottom + 24;

  const body = (
    <View style={[{ width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: padded ? gutter : 0, gap: 16 }, contentStyle]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: background ?? colors.background }}>
      {header === null ? null : header ?? <AppHeader title={title} subtitle={subtitle} back={back} right={headerRight} backFallback={backFallback} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomPad }}
            refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
            {...scrollProps}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 0 }}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              paddingHorizontal: gutter,
              paddingTop: 12,
              paddingBottom: tabBar ? tabSpace : Math.max(insets.bottom, 12),
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ width: '100%', maxWidth: narrow ? 640 : maxWidth, alignSelf: 'center' }}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
