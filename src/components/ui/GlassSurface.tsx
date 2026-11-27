import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { radius as R, useTheme } from '@/theme';

export type GlassSurfaceProps = ViewProps & {
  /** 'regular' frosts more; 'clear' is closer to plain translucency. */
  glass?: 'regular' | 'clear';
  radius?: number;
  /** Hairline edge that gives the glass its lift. */
  bordered?: boolean;
  intensity?: number;
  tint?: string;
};

/**
 * One translucent surface with the same geometry on every platform — the same
 * approach as the Kool Logistics app.
 *
 * iOS 26+ gets real Liquid Glass (expo-glass-effect). Android, older iOS and
 * web fall back to a blur with matching tint and radius, so layout never
 * shifts between platforms.
 */
export function GlassSurface({ glass = 'regular', radius = R.lg, bordered = true, intensity = 40, tint, style, children, ...rest }: GlassSurfaceProps) {
  const { mode } = useTheme();

  const shell: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.55)',
  };

  if (isLiquidGlassAvailable()) {
    return (
      // Bound to the app's theme, so a manual Light/Dark choice in Account is respected.
      <GlassView glassEffectStyle={glass} colorScheme={mode} tintColor={tint} style={[shell, style]} {...rest}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[shell, style]} {...rest}>
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
      <BlurView
        intensity={intensity}
        tint={mode === 'dark' ? 'dark' : 'light'}
        // Android draws no blur without this.
        experimentalBlurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      {/* Keeps contrast in line with the iOS glass. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === 'dark' ? 'rgba(28,30,35,0.72)' : 'rgba(255,255,255,0.72)', opacity: tint ? 0.28 : 0.5 }]} />
      {children}
    </View>
  );
}

export const liquidGlassSupported = isLiquidGlassAvailable;
