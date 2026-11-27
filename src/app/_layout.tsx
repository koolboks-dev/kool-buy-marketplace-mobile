import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { loadStoredTokens } from '@/lib/token-storage';
import { CartProvider } from '@/store/cart';
import { SessionProvider, useSession } from '@/store/session';
import { AppFonts, AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(AppFonts);
  const [tokensReady, setTokensReady] = useState(false);

  // Read the saved session before the first API call so requests carry the token.
  useEffect(() => {
    loadStoredTokens().finally(() => setTokensReady(true));
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && tokensReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <SessionProvider>
            <CartProvider>
              <ToastProvider>
                <Shell />
              </ToastProvider>
            </CartProvider>
          </SessionProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Same gates as the web middleware/AccountGate:
 * - signed-out users can browse the marketplace but not dashboards;
 * - a staff-invited account on its temporary password must change it first;
 * - a KoolBuy Store customer on first sign-in chooses a role;
 * - non-staff never see /admin, non-sellers never see /seller.
 */
function useAccessGuard() {
  const { status, user, isStaff, isSeller } = useSession();
  const segments = useSegments() as string[];
  const router = useRouter();
  const top = segments[0];

  useEffect(() => {
    if (status === 'booting') return;
    const protectedArea = ['admin', 'seller', 'buyer', 'checkout', 'notifications', 'invoices'].includes(top ?? '');
    if (status === 'signedOut') {
      if (protectedArea) router.replace('/login');
      return;
    }
    if (user?.must_change_password && top !== 'change-password') {
      router.replace('/change-password');
      return;
    }
    if (user?.needs_role_choice && top !== 'choose-role' && top !== 'change-password') {
      router.replace('/choose-role');
      return;
    }
    if (top === 'admin' && !isStaff) router.replace('/(tabs)/account');
    if (top === 'seller' && !isSeller && !isStaff) router.replace('/(tabs)/account');
  }, [status, user, isStaff, isSeller, top, router]);
}

function Shell() {
  const { mode, colors } = useTheme();
  useAccessGuard();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: colors.background, card: colors.surface, border: colors.border, text: colors.text, primary: colors.brand },
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }} />
      </View>
    </ThemeProvider>
  );
}
