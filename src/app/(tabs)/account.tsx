import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { MenuSections } from '@/components/MenuSections';
import { Avatar, Badge, Button, Card, Glyph, ListRow, Logo, Screen, Segmented, StatusBadge, Text } from '@/components/ui';
import { WEB_BASE_URL } from '@/lib/config';
import { ADMIN_MENU, BUYER_MENU, hasStaffPermission, roleLabel, sellerMenu } from '@/lib/nav';
import { useSession } from '@/store/session';
import { radius, useTheme, type ThemePreference } from '@/theme';

/** Account: the mobile side nav for every role. */
export default function AccountScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { status, user, isStaff, isSeller, permissions, signOut } = useSession();

  const themeRow = (
    <Card style={{ gap: 10 }}>
      <Text variant="subtitle">Appearance</Text>
      <Segmented<ThemePreference>
        value={preference}
        onChange={setPreference}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
    </Card>
  );

  const helpCard = (
    <Card padding={0}>
      <ListRow icon="info" title="About KoolBuy" onPress={() => Linking.openURL(`${WEB_BASE_URL}/about`)} />
      <ListRow icon="chat" title="Contact us" onPress={() => Linking.openURL(`${WEB_BASE_URL}/contact`)} />
      <ListRow icon="document" title="Terms of use" onPress={() => Linking.openURL(`${WEB_BASE_URL}/terms-of-use`)} />
      <ListRow icon="lock" title="Privacy policy" onPress={() => Linking.openURL(`${WEB_BASE_URL}/privacy-policy`)} last />
    </Card>
  );

  if (status !== 'signedIn' || !user) {
    return (
      <Screen title="Account" back={false} tabBar>
        <Card padding={20} style={{ alignItems: 'center', gap: 10 }}>
          <Logo height={28} />
          <Text variant="heading" align="center">
            Buy stock. Own your solar freezer.
          </Text>
          <Text variant="secondary" align="center">
            Sign in to track orders, save stores and manage your business.
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
            <Button label="Sign in" variant="primary" size="lg" full onPress={() => router.push('/login')} />
            <Button label="Create an account" variant="outline" full onPress={() => router.push('/signup')} />
            <Button label="Join as a vendor" variant="ghost" full onPress={() => router.push({ pathname: '/signup', params: { role: 'retailer' } })} />
          </View>
        </Card>
        {themeRow}
        {helpCard}
      </Screen>
    );
  }

  const name = user.seller_profile?.business_name || user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const adminItems = ADMIN_MENU.filter((i) => hasStaffPermission(permissions, i.permission));

  return (
    <Screen title={isStaff ? 'Admin' : isSeller ? 'My store' : 'Account'} back={false} tabBar>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar uri={user.seller_profile?.logo_url || user.profile_image_url} name={name} size={54} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="subtitle" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {user.email || user.phone_number}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge label={isStaff ? user.staff?.role?.name || (user.staff?.is_super_admin ? 'Super Admin' : 'Staff') : roleLabel(user.role)} tone={isStaff ? 'brand' : 'neutral'} />
            {user.seller_profile ? <StatusBadge status={user.seller_profile.is_verified} /> : null}
          </View>
        </View>
      </Card>

      {isStaff ? (
        <>
          <Card onPress={() => router.push('/admin')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navActive, borderColor: colors.navActive }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name="grid" size={20} color={colors.onNavActive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle" color={colors.onNavActive}>
                Admin dashboard
              </Text>
              <Text variant="caption" color={colors.onNavActive} style={{ opacity: 0.75 }}>
                Platform analytics and statistics
              </Text>
            </View>
            <Glyph name="chevron-forward" size={18} color={colors.onNavActive} />
          </Card>
          <MenuSections items={adminItems.filter((i) => i.href !== '/admin')} />
        </>
      ) : isSeller ? (
        <>
          {user.marketplace_access && !user.marketplace_access.approved ? (
            <Card muted style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Glyph name="info" size={18} color={colors.warning} />
                <Text weight="semibold" color={colors.text}>
                  Ordering unlocks once your business is approved
                </Text>
              </View>
              <Text variant="caption">{user.marketplace_access.reason || 'Complete your onboarding so our team can verify your business.'}</Text>
              <Button label="Complete onboarding on the web" variant="outline" size="sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => Linking.openURL(`${WEB_BASE_URL}/onboarding`)} />
            </Card>
          ) : null}
          <MenuSections items={sellerMenu(user.role)} />
        </>
      ) : (
        <MenuSections items={BUYER_MENU} />
      )}

      {themeRow}
      {helpCard}
      <Card padding={0}>
        <ListRow icon="lock" title="Change password" onPress={() => router.push('/change-password')} />
        <ListRow
          icon="logout"
          title="Sign out"
          danger
          last
          onPress={() => {
            signOut();
            router.replace('/(tabs)');
          }}
        />
      </Card>
    </Screen>
  );
}
