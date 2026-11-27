import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, ErrorState, InfoRow, Input, ListSkeleton, Screen, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { getBuyerProfile, updateBuyerProfile } from '@/services/buyer';
import { useSession } from '@/store/session';

/** Profile (web /buyer/profile). */
export default function BuyerProfile() {
  const toast = useToast();
  const { refresh } = useSession();
  const q = useAsync(() => getBuyerProfile(), []);
  const [edits, setEdits] = useState<{ first?: string; last?: string; address?: string }>({});
  const [saving, setSaving] = useState(false);
  const first = edits.first ?? q.data?.first_name ?? '';
  const last = edits.last ?? q.data?.last_name ?? '';
  const address = edits.address ?? q.data?.address ?? '';
  const setFirst = (v: string) => setEdits((e) => ({ ...e, first: v }));
  const setLast = (v: string) => setEdits((e) => ({ ...e, last: v }));
  const setAddress = (v: string) => setEdits((e) => ({ ...e, address: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateBuyerProfile({ first_name: first.trim(), last_name: last.trim(), address: address.trim() });
      await Promise.all([q.reload(), refresh()]);
      setEdits({});
      toast.show('Profile saved', 'success');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const p = q.data;
  return (
    <Screen title="Profile" subtitle="Your details" narrow refreshing={q.refreshing} onRefresh={q.refresh} footer={p ? <Button label="Save changes" variant="ink" full loading={saving} onPress={save} /> : undefined}>
      {q.loading ? (
        <ListSkeleton rows={3} />
      ) : q.error || !p ? (
        <ErrorState message={q.error ?? 'Could not load your profile.'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <Avatar uri={p.profile_image_url} name={`${p.first_name} ${p.last_name}`} size={76} />
            <Text variant="heading">
              {p.first_name} {p.last_name}
            </Text>
            <Text variant="caption">Member since {p.year_joined}</Text>
          </Card>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="First name" value={first} onChangeText={setFirst} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Last name" value={last} onChangeText={setLast} />
              </View>
            </View>
            <Input label="Address" value={address} onChangeText={setAddress} multiline icon="location" />
          </Card>
          <Card padding={14}>
            <InfoRow label="Email" value={p.email} icon="mail" />
            <InfoRow label="Phone" value={p.phone_number} icon="phone" last />
          </Card>
        </>
      )}
    </Screen>
  );
}
