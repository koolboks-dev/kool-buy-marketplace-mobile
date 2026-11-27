import { useState } from 'react';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Avatar, Badge, Button, Card, Input, Sheet, StatusBadge, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { listStoreProfiles, updateStoreProfile, type AdminStoreProfile } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'all' | 'retailer' | 'wholesaler' | 'missing';
type Form = Pick<AdminStoreProfile, 'business_name' | 'phone' | 'whatsapp_number' | 'description' | 'address' | 'city' | 'state'>;

/** Store Profiles (web /admin/store-profiles): every store's details and location. */
export default function AdminStoreProfiles() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const [edit, setEdit] = useState<{ store: AdminStoreProfile; update: (fn: (items: AdminStoreProfile[]) => AdminStoreProfile[]) => void } | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = can(['store_profiles.edit', 'store_profiles.*']);

  return (
    <>
      <AdminList<AdminStoreProfile, Tab>
        title="Store Profiles"
        subtitle="Every store’s details and location"
        searchPlaceholder="Store, owner, city or state"
        tabs={[
          { value: 'all', label: 'All', countKey: 'all' },
          { value: 'retailer', label: 'Retailers' },
          { value: 'wholesaler', label: 'Wholesalers' },
          { value: 'missing', label: 'No location', countKey: 'missing_location' },
        ]}
        keyOf={(s) => s.id}
        illustration="no-vendors"
        empty={{ title: 'No stores found' }}
        fetchPage={async ({ page, q, tab }) => {
          const r = await listStoreProfiles({ page, q: q || undefined, role: tab === 'retailer' || tab === 'wholesaler' ? tab : undefined, location: tab === 'missing' ? 'missing' : undefined });
          return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
        }}
        renderItem={(s, { update }) => (
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar uri={s.logo_url} name={s.business_name} size={40} />
              <View style={{ flex: 1 }}>
                <Text weight="semibold" color={colors.text} numberOfLines={1}>
                  {s.business_name}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {s.owner_name} · {s.phone}
                </Text>
              </View>
              <StatusBadge status={s.is_verified} />
            </View>
            <Text size={13} numberOfLines={2}>
              {s.address || 'No address'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={s.role} />
              {s.location_label ? <Badge label={s.location_label} icon="location" /> : null}
              {s.latitude == null ? <Badge label="No map pin" tone="warning" /> : null}
              <Badge label={`${s.product_count} products`} />
            </View>
            {canEdit ? (
              <Button
                label="Edit details"
                icon="edit"
                size="sm"
                variant="outline"
                style={{ alignSelf: 'flex-start' }}
                onPress={() => {
                  setForm({ business_name: s.business_name, phone: s.phone, whatsapp_number: s.whatsapp_number, description: s.description, address: s.address, city: s.city, state: s.state });
                  setEdit({ store: s, update });
                }}
              />
            ) : null}
          </Card>
        )}
      />
      <Sheet
        visible={Boolean(edit && form)}
        onClose={() => setEdit(null)}
        title="Edit store"
        subtitle={edit?.store.business_name}
        footer={
          <Button
            label="Save"
            variant="ink"
            full
            loading={saving}
            onPress={async () => {
              if (!edit || !form) return;
              setSaving(true);
              try {
                const r = await updateStoreProfile(edit.store.id, form);
                edit.update((items) => items.map((x) => (x.id === edit.store.id ? r.item ?? { ...x, ...form } : x)));
                toast.show('Store saved', 'success');
                setEdit(null);
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              } finally {
                setSaving(false);
              }
            }}
          />
        }
      >
        {form ? (
          <>
            <Input label="Business name" value={form.business_name} onChangeText={(t) => setForm({ ...form, business_name: t })} />
            <Input label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
            <Input label="WhatsApp" value={form.whatsapp_number} onChangeText={(t) => setForm({ ...form, whatsapp_number: t })} keyboardType="phone-pad" />
            <Input label="Address" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="State" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} />
              </View>
            </View>
            <Input label="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />
          </>
        ) : null}
      </Sheet>
    </>
  );
}
