import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ErrorState, Input, ListSkeleton, RadioList, Screen, Select, Sheet, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { createAddress, deleteAddress, listAddresses, setDefaultAddress, updateAddress } from '@/services/buyer';
import type { DeliveryAddressInput, SavedAddress } from '@/services/types';
import { useTheme } from '@/theme';

const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

const EMPTY: DeliveryAddressInput = { label: 'home', street: '', city: '', state: 'Lagos', delivery_note: '', is_default: false };

/** Delivery addresses (web buyer settings → addresses). */
export default function Addresses() {
  const params = useLocalSearchParams<{ add?: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const q = useAsync(() => listAddresses().then((r) => r.items ?? []), []);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeliveryAddressInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.add) openNew();
  }, [params.add]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setForm({ label: (a.label as DeliveryAddressInput['label']) || 'home', street: a.street, city: a.city, state: a.state, delivery_note: a.delivery_note ?? '', is_default: a.is_default });
    setOpen(true);
  };

  const save = async () => {
    if (!form.street.trim() || !form.city.trim() || !form.state) return toast.show('Street, city and state are required.', 'error');
    setSaving(true);
    try {
      if (editing) await updateAddress(editing.id, form);
      else await createAddress(form);
      setOpen(false);
      await q.reload();
      toast.show('Address saved', 'success');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const items = q.data ?? [];
  return (
    <Screen title="Delivery addresses" narrow refreshing={q.refreshing} onRefresh={q.refresh} headerRight={<Button label="Add" icon="plus" size="sm" variant="ink" onPress={openNew} />}>
      {q.loading ? (
        <ListSkeleton rows={3} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : items.length === 0 ? (
        <EmptyState illustration="cold-chain-delivery" title="No addresses yet" description="Add where your orders should be delivered." action="Add an address" onAction={openNew} />
      ) : (
        items.map((a) => (
          <Card key={a.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="subtitle">{a.label.charAt(0).toUpperCase() + a.label.slice(1)}</Text>
              {a.is_default ? <Badge label="Default" tone="brand" /> : null}
            </View>
            <Text>{[a.street, a.city, a.state].filter(Boolean).join(', ')}</Text>
            {a.delivery_note ? <Text variant="caption">{a.delivery_note}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button label="Edit" size="sm" variant="outline" icon="edit" onPress={() => openEdit(a)} />
              {!a.is_default ? (
                <Button
                  label="Make default"
                  size="sm"
                  variant="ghost"
                  onPress={async () => {
                    try {
                      await setDefaultAddress(a.id);
                      q.reload();
                    } catch (err) {
                      toast.show(errorMessage(err), 'error');
                    }
                  }}
                />
              ) : null}
              <Button
                label="Delete"
                size="sm"
                variant="ghost"
                onPress={() =>
                  Alert.alert('Delete address?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteAddress(a.id);
                          q.reload();
                        } catch (err) {
                          toast.show(errorMessage(err), 'error');
                        }
                      },
                    },
                  ])
                }
              />
            </View>
          </Card>
        ))
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title={editing ? 'Edit address' : 'New address'} footer={<Button label="Save address" variant="ink" full loading={saving} onPress={save} />}>
        <RadioList
          value={form.label}
          onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          options={[
            { value: 'home', label: 'Home' },
            { value: 'office', label: 'Office' },
            { value: 'storehouse', label: 'Storehouse' },
          ]}
        />
        <Input label="Street" value={form.street} onChangeText={(t) => setForm((f) => ({ ...f, street: t }))} />
        <Input label="City / area" value={form.city} onChangeText={(t) => setForm((f) => ({ ...f, city: t }))} />
        <Select label="State" value={form.state} options={NG_STATES.map((s) => ({ value: s, label: s }))} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
        <Input label="Delivery note (optional)" value={form.delivery_note ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, delivery_note: t }))} multiline placeholder="Landmark, gate code…" />
        <Text variant="caption" color={colors.textMuted}>
          The rider uses this address to find you.
        </Text>
      </Sheet>
    </Screen>
  );
}
