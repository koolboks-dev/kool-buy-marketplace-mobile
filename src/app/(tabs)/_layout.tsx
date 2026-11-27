import { Tabs } from 'expo-router';

import { TabBar, type TabItem } from '@/components/ui/TabBar';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/**
 * The bottom nav — the web's MobileBottomNav (Home, Browse, Cart, KoolSpace,
 * Account) as a floating Liquid Glass bar, like Kool Logistics. KoolSpace is
 * hidden for wholesalers and staff, as on the web.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { count } = useCart();
  const { isWholesaler, isStaff, isSeller, status } = useSession();

  const tabs: (TabItem & { hidden?: boolean })[] = [
    { key: 'index', label: 'Home', icon: 'home' },
    { key: 'browse', label: 'Browse', icon: 'search' },
    { key: 'cart', label: 'Cart', icon: 'cart', badge: count },
    { key: 'koolspace', label: 'KoolSpace', icon: 'layers', hidden: isWholesaler || isStaff },
    {
      key: 'account',
      label: status === 'signedIn' ? (isStaff ? 'Admin' : isSeller ? 'Store' : 'Account') : 'Account',
      icon: isStaff ? 'grid' : isSeller ? 'store' : 'user',
    },
  ];

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: colors.background } }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          tabs={tabs.filter((t) => !t.hidden)}
          value={state.routes[state.index]?.name ?? 'index'}
          onChange={(key) => {
            const route = state.routes.find((r) => r.name === key);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="browse" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="koolspace" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
