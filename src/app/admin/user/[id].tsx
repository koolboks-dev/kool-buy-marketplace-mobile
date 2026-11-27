import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, View } from 'react-native';
import { useState } from 'react';

import { Avatar, Badge, Button, Card, ErrorState, InfoRow, ListSkeleton, Screen, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getAdminUser, setAdminUserActive } from '@/services/admin';
import { useSession } from '@/store/session';

/** User detail (web /admin/users/[id]). */
export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getAdminUser(id).then((r) => r.user), [id]);
  const [busy, setBusy] = useState(false);
  const u = q.data;

  const toggle = () => {
    if (!u) return;
    const next = !u.is_active;
    Alert.alert(next ? 'Activate this account?' : 'Deactivate this account?', next ? 'They will be able to sign in again.' : 'They will be signed out and cannot sign in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next ? 'Activate' : 'Deactivate',
        style: next ? 'default' : 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const r = await setAdminUserActive(u.id, next);
            q.setData(r.user ?? { ...u, is_active: next });
            toast.show(next ? 'Account activated' : 'Account deactivated', 'success');
          } catch (err) {
            toast.show(errorMessage(err), 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen title="User" subtitle={u?.email} narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/users">
      {q.loading ? (
        <ListSkeleton rows={3} />
      ) : q.error || !u ? (
        <ErrorState message={q.error ?? 'User not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <Avatar name={u.name || u.email} size={68} />
            <Text variant="heading">{u.name || [u.first_name, u.last_name].join(' ')}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <StatusBadge status={u.is_staff ? 'admin' : u.role} />
              <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
              {u.is_email_verified ? <Badge label="Email verified" tone="verified" /> : null}
            </View>
          </Card>
          <Card padding={14}>
            <InfoRow label="Email" value={u.email} icon="mail" />
            <InfoRow label="Phone" value={u.phone_number} icon="phone" />
            <InfoRow label="Address" value={u.address || u.buyer_profile?.default_address} icon="location" />
            <InfoRow label="Joined" value={formatDateTime(u.date_joined)} icon="calendar" />
            <InfoRow label="Saved stores" value={u.buyer_profile?.favorite_store_count ?? '—'} last />
          </Card>
          {u.seller_profile ? (
            <Card padding={14}>
              <Text variant="subtitle" style={{ marginBottom: 4 }}>
                Store
              </Text>
              <InfoRow label="Business" value={u.seller_profile.business_name} />
              <InfoRow label="Verification" value={<StatusBadge status={u.seller_profile.is_verified} />} last />
              <Button label="Open seller" variant="outline" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/admin/seller/[id]', params: { id: u.seller_profile!.id } })} />
            </Card>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {u.phone_number ? <Button label="Call" icon="phone" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${u.phone_number}`)} /> : null}
            {u.email ? <Button label="Email" icon="mail" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:${u.email}`)} /> : null}
          </View>
          {can(['users.edit', 'users.*']) ? (
            <Button label={u.is_active ? 'Deactivate account' : 'Activate account'} variant={u.is_active ? 'destructive' : 'ink'} full loading={busy} onPress={toggle} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
