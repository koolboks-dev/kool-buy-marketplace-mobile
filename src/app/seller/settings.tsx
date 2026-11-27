import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, ErrorState, FilterTabs, InfoRow, Input, ListSkeleton, Screen, SwitchRow, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import {
  getLoginHistory,
  getSellerBusinessHours,
  getSellerNotificationSettings,
  getSellerProfileSettings,
  getSellerStoreSettings,
  revokeLoginSession,
  updateSellerBusinessHours,
  updateSellerNotificationSettings,
  updateSellerProfileSettings,
  updateSellerStoreSettings,
  type BusinessHours,
  type SellerNotificationSettings,
} from '@/services/seller';
import { useSession } from '@/store/session';

type Tab = 'profile' | 'store' | 'hours' | 'notifications' | 'security';

/** Settings (web /retailer/settings, /wholesaler/settings). */
export default function SellerSettings() {
  const { isWholesaler } = useSession();
  const [tab, setTab] = useState<Tab>('profile');
  return (
    <Screen title="Settings" subtitle={isWholesaler ? 'Depot settings, warehouse address and notifications' : 'Make changes to your store information'} narrow backFallback="/seller">
      <FilterTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'store', label: isWholesaler ? 'Depot' : 'Store' },
          { value: 'hours', label: 'Hours' },
          { value: 'notifications', label: 'Notifications' },
          { value: 'security', label: 'Security' },
        ]}
      />
      {tab === 'profile' ? <ProfileTab /> : tab === 'store' ? <StoreTab /> : tab === 'hours' ? <HoursTab /> : tab === 'notifications' ? <NotificationsTab /> : <SecurityTab />}
    </Screen>
  );
}

function useSaver() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const save = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      toast.show('Saved', 'success');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  return { saving, save };
}

function ProfileTab() {
  const q = useAsync(() => getSellerProfileSettings().then((r) => r.settings), []);
  const { saving, save } = useSaver();
  type F = { business_name: string; business_description: string; phone_number: string; whatsapp_number: string };
  const [edits, setF] = useState<Partial<F>>({});
  const f: F = {
    business_name: q.data?.business_name ?? '',
    business_description: q.data?.business_description ?? '',
    phone_number: q.data?.phone_number ?? '',
    whatsapp_number: q.data?.whatsapp_number ?? '',
    ...edits,
  };
  if (q.loading) return <ListSkeleton rows={3} />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.refresh} />;
  return (
    <Card style={{ gap: 12 }}>
      <Input label="Business name" value={f.business_name} onChangeText={(t) => setF((s) => ({ ...s, business_name: t }))} />
      <Input label="About your business" value={f.business_description} onChangeText={(t) => setF((s) => ({ ...s, business_description: t }))} multiline />
      <Input label="Phone number" value={f.phone_number} onChangeText={(t) => setF((s) => ({ ...s, phone_number: t }))} keyboardType="phone-pad" icon="phone" />
      <Input label="WhatsApp number" value={f.whatsapp_number} onChangeText={(t) => setF((s) => ({ ...s, whatsapp_number: t }))} keyboardType="phone-pad" icon="whatsapp" />
      <InfoRow label="Email" value={q.data?.email} icon="mail" last />
      <Button label="Save profile" variant="ink" loading={saving} onPress={() => save(() => updateSellerProfileSettings(f))} />
    </Card>
  );
}

function StoreTab() {
  const q = useAsync(() => getSellerStoreSettings().then((r) => r.settings), []);
  const { saving, save } = useSaver();
  type F = { address: string; city: string; state: string; facebook_url: string; instagram_url: string; x_url: string };
  const [edits, setF] = useState<Partial<F>>({});
  const f: F = {
    address: q.data?.address ?? '',
    city: q.data?.city ?? '',
    state: q.data?.state ?? '',
    facebook_url: q.data?.facebook_url ?? '',
    instagram_url: q.data?.instagram_url ?? '',
    x_url: q.data?.x_url ?? '',
    ...edits,
  };
  if (q.loading) return <ListSkeleton rows={3} />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.refresh} />;
  return (
    <Card style={{ gap: 12 }}>
      <InfoRow label="Store name" value={q.data?.business_name} />
      <InfoRow label="Type" value={q.data?.business_type} last />
      <Input label="Address" value={f.address} onChangeText={(t) => setF((s) => ({ ...s, address: t }))} multiline icon="location" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="City" value={f.city} onChangeText={(t) => setF((s) => ({ ...s, city: t }))} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="State" value={f.state} onChangeText={(t) => setF((s) => ({ ...s, state: t }))} />
        </View>
      </View>
      <Input label="Facebook" value={f.facebook_url} onChangeText={(t) => setF((s) => ({ ...s, facebook_url: t }))} autoCapitalize="none" />
      <Input label="Instagram" value={f.instagram_url} onChangeText={(t) => setF((s) => ({ ...s, instagram_url: t }))} autoCapitalize="none" />
      <Input label="X (Twitter)" value={f.x_url} onChangeText={(t) => setF((s) => ({ ...s, x_url: t }))} autoCapitalize="none" />
      <Button label="Save store" variant="ink" loading={saving} onPress={() => save(() => updateSellerStoreSettings(f))} />
    </Card>
  );
}

function HoursTab() {
  const q = useAsync(() => getSellerBusinessHours(), []);
  const { saving, save } = useSaver();
  const DEFAULT_HOURS: BusinessHours = { weekday: { open_time: '08:00', close_time: '18:00' }, saturday: { is_closed: false, open_time: '09:00', close_time: '16:00' }, sunday: { is_closed: true } };
  const [edited, setH] = useState<BusinessHours | null>(null);
  const h: BusinessHours = edited ?? (q.data?.weekday ? { weekday: q.data.weekday, saturday: q.data.saturday, sunday: q.data.sunday } : DEFAULT_HOURS);
  if (q.loading) return <ListSkeleton rows={3} />;
  const time = (v?: string) => (v ?? '').slice(0, 5);
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="subtitle">Monday – Friday</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Opens" value={time(h.weekday.open_time)} onChangeText={(t) => setH(() => ({ ...h, weekday: { ...h.weekday, open_time: t } }))} placeholder="08:00" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Closes" value={time(h.weekday.close_time)} onChangeText={(t) => setH(() => ({ ...h, weekday: { ...h.weekday, close_time: t } }))} placeholder="18:00" />
        </View>
      </View>
      {(['saturday', 'sunday'] as const).map((d) => (
        <View key={d} style={{ gap: 8 }}>
          <SwitchRow label={d === 'saturday' ? 'Open on Saturday' : 'Open on Sunday'} value={!h[d].is_closed} onValueChange={(v) => setH(() => ({ ...h, [d]: { ...h[d], is_closed: !v } }))} last />
          {!h[d].is_closed ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="Opens" value={time(h[d].open_time)} onChangeText={(t) => setH(() => ({ ...h, [d]: { ...h[d], open_time: t } }))} placeholder="09:00" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Closes" value={time(h[d].close_time)} onChangeText={(t) => setH(() => ({ ...h, [d]: { ...h[d], close_time: t } }))} placeholder="16:00" />
              </View>
            </View>
          ) : null}
        </View>
      ))}
      <Text variant="caption">Use 24-hour time, e.g. 08:00 or 17:30.</Text>
      <Button label="Save hours" variant="ink" loading={saving} onPress={() => save(() => updateSellerBusinessHours(h))} />
    </Card>
  );
}

const NOTIF: { key: keyof SellerNotificationSettings; label: string; description?: string }[] = [
  { key: 'channel_email_enabled', label: 'Email' },
  { key: 'channel_sms_enabled', label: 'SMS' },
  { key: 'channel_whatsapp_enabled', label: 'WhatsApp' },
  { key: 'pref_new_order', label: 'New orders' },
  { key: 'pref_order_cancellations', label: 'Order cancellations' },
  { key: 'pref_customer_messages', label: 'Customer messages' },
  { key: 'pref_product_review', label: 'Product reviews' },
  { key: 'pref_payment_notification', label: 'Payments' },
];

function NotificationsTab() {
  const q = useAsync(() => getSellerNotificationSettings().then((r) => r.settings), []);
  const toast = useToast();
  if (q.loading) return <ListSkeleton rows={3} />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? 'Could not load settings.'} onRetry={q.refresh} />;
  const set = async (key: keyof SellerNotificationSettings, v: boolean) => {
    q.setData((d) => (d ? { ...d, [key]: v } : d));
    try {
      await updateSellerNotificationSettings({ [key]: v });
    } catch (err) {
      q.setData((d) => (d ? { ...d, [key]: !v } : d));
      toast.show(errorMessage(err), 'error');
    }
  };
  return (
    <>
      <Card padding={14}>
        <Text variant="overline">Channels</Text>
        {NOTIF.slice(0, 3).map((n, i) => (
          <SwitchRow key={n.key} label={n.label} value={Boolean(q.data?.[n.key])} onValueChange={(v) => set(n.key, v)} last={i === 2} />
        ))}
      </Card>
      <Card padding={14}>
        <Text variant="overline">Tell me about</Text>
        {NOTIF.slice(3).map((n, i, arr) => (
          <SwitchRow key={n.key} label={n.label} value={Boolean(q.data?.[n.key])} onValueChange={(v) => set(n.key, v)} last={i === arr.length - 1} />
        ))}
      </Card>
    </>
  );
}

function SecurityTab() {
  const q = useAsync(() => getLoginHistory(1).then((r) => r.items ?? []), []);
  const toast = useToast();
  if (q.loading) return <ListSkeleton rows={3} />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.refresh} />;
  return (
    <Card style={{ gap: 4 }}>
      <Text variant="subtitle">Where you are signed in</Text>
      {(q.data ?? []).map((s) => (
        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <Text weight="medium">{s.device || 'Unknown device'}</Text>
            <Text variant="caption">
              {s.location || 'Unknown location'} · {timeAgo(s.time)}
            </Text>
          </View>
          {s.is_current_session ? (
            <Badge label="This device" tone="brand" />
          ) : s.is_active ? (
            <Button
              label="Sign out"
              size="sm"
              variant="outline"
              onPress={async () => {
                try {
                  await revokeLoginSession(s.id);
                  q.reload();
                } catch (err) {
                  toast.show(errorMessage(err), 'error');
                }
              }}
            />
          ) : (
            <Badge label="Signed out" />
          )}
        </View>
      ))}
    </Card>
  );
}
