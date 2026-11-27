import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Glyph,
  Input,
  ListSkeleton,
  Screen,
  Select,
  Sheet,
  StatusBadge,
  Text,
  useToast,
  Well,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { titleCase } from '@/lib/format';
import {
  createKoolSpaceRequirement,
  deleteKoolSpaceRequirement,
  getKoolSpaceOverview,
  KOOLSPACE_UNITS,
  type KoolSpaceRequirementBody,
} from '@/services/buyer';
import { listProductCategories } from '@/services/catalog';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const FREQ = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/**
 * KoolSpace (web /buyer/koolspace): tell us what you buy regularly and we
 * match you to a preferred vendor who restocks you.
 */
export default function KoolSpaceScreen() {
  const { colors } = useTheme();
  const { status } = useSession();
  const toast = useToast();
  const q = useAsync(() => getKoolSpaceOverview(), [status], { skip: status !== 'signedIn' });
  const cats = useAsync(() => listProductCategories().then((r) => r.items ?? []), []);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<KoolSpaceRequirementBody>({
    explainer_accepted: true,
    product_type: '',
    weekly_purchase_volume: '',
    unit: 'kg',
    purchase_frequency: 'weekly',
    preferred_price_point: '',
    preferred_delivery_days: [],
    notes: '',
  });

  if (status !== 'signedIn') {
    return (
      <Screen title="KoolSpace" subtitle="Your regular supply, matched to vendors" back={false} tabBar>
        <EmptyState illustration="koolspace" title="Never run out of stock" description="Tell us what you buy every week and we'll match you to a trusted vendor who restocks you on your schedule." action="Sign in to start" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  const types = q.data?.policy?.allowed_product_types?.length ? q.data.policy.allowed_product_types : cats.data ?? [];
  const reqs = q.data?.requirements ?? [];

  const save = async () => {
    if (!form.product_type) return toast.show('Choose what you buy.', 'error');
    if (!form.weekly_purchase_volume) return toast.show('Enter how much you buy.', 'error');
    if (!form.preferred_price_point) return toast.show('Enter the price you usually pay.', 'error');
    setSaving(true);
    try {
      const res = await createKoolSpaceRequirement({ ...form, notes: form.notes || undefined });
      toast.show(res.qualified ? 'Saved — we are matching you to a vendor.' : 'Saved. We will review your request.', 'success');
      setOpen(false);
      q.reload();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="KoolSpace"
      subtitle="Your regular supply, matched to vendors"
      back={false}
      tabBar
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      headerRight={q.data?.koolspace_enabled !== false ? <Button label="Add" icon="plus" size="sm" variant="ink" onPress={() => setOpen(true)} /> : undefined}
    >
      {q.loading ? (
        <ListSkeleton rows={3} height={120} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.koolspace_enabled === false ? (
        <EmptyState illustration="koolspace" title="KoolSpace is not open yet" description="We'll let you know when matching opens in your area." />
      ) : (
        <>
          <Well>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Glyph name="layers" size={20} color={colors.brand} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text weight="semibold" color={colors.text}>
                  How KoolSpace works
                </Text>
                <Text variant="caption">
                  Add each product you buy regularly. We check it qualifies, then match you to a preferred vendor who confirms each restock with you.
                </Text>
              </View>
            </View>
          </Well>
          {reqs.length === 0 ? (
            <EmptyState illustration="koolspace" title="No requirements yet" description="Add what you buy every week to get matched to a vendor." action="Add a requirement" onAction={() => setOpen(true)} />
          ) : (
            reqs.map((r) => (
              <Card key={r.public_id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="subtitle">{r.other_label || r.product_type_label}</Text>
                    <Text variant="caption">
                      {r.weekly_purchase_volume} {r.unit} · {titleCase(r.purchase_frequency)} · around {r.preferred_price_point}
                    </Text>
                  </View>
                  <StatusBadge status={r.assignment_status || r.qualification_status} />
                </View>
                {r.assigned_seller ? (
                  <Badge label={`Vendor: ${r.assigned_seller.business_name || r.assigned_seller.name || 'Assigned'}`} tone="brand" icon="store" />
                ) : null}
                {r.qualification_status === 'failed' && r.qualification_reason?.length ? <Text variant="caption" color={colors.dangerText}>{r.qualification_reason.join(' · ')}</Text> : null}
                {r.match_explanation?.length ? <Text variant="caption">{r.match_explanation.join(' ')}</Text> : null}
                {r.preferred_delivery_days?.length ? <Text variant="caption">Delivery: {r.preferred_delivery_days.map(titleCase).join(', ')}</Text> : null}
                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  style={{ alignSelf: 'flex-start' }}
                  onPress={() =>
                    Alert.alert('Remove requirement?', 'Your vendor match for this product will end.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteKoolSpaceRequirement(r.public_id);
                            q.reload();
                          } catch (err) {
                            toast.show(errorMessage(err), 'error');
                          }
                        },
                      },
                    ])
                  }
                />
              </Card>
            ))
          )}
        </>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="Add a requirement" subtitle="What do you buy regularly?" footer={<Button label="Save requirement" variant="ink" full loading={saving} onPress={save} />}>
        <Select label="Product" value={form.product_type} options={types.map((t) => ({ value: t.value, label: t.label }))} onChange={(v) => setForm((f) => ({ ...f, product_type: v }))} placeholder="Choose a product type" />
        {form.product_type === 'others' ? <Input label="What product?" value={form.other_label ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, other_label: t }))} /> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Quantity per week" value={form.weekly_purchase_volume} onChangeText={(t) => setForm((f) => ({ ...f, weekly_purchase_volume: t.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="Unit" value={form.unit} options={KOOLSPACE_UNITS.map((u) => ({ value: u, label: titleCase(u) }))} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} />
          </View>
        </View>
        <Select label="How often" value={form.purchase_frequency} options={[...FREQ]} onChange={(v) => setForm((f) => ({ ...f, purchase_frequency: v }))} />
        <Input label="Price you usually pay (per unit)" value={form.preferred_price_point} onChangeText={(t) => setForm((f) => ({ ...f, preferred_price_point: t.replace(/[^\d.]/g, '') }))} keyboardType="decimal-pad" />
        <Text variant="label">Preferred delivery days</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DAYS.map((d) => {
            const on = form.preferred_delivery_days?.includes(d);
            return (
              <Chip
                key={d}
                label={titleCase(d).slice(0, 3)}
                active={on}
                onPress={() => setForm((f) => ({ ...f, preferred_delivery_days: on ? f.preferred_delivery_days?.filter((x) => x !== d) : [...(f.preferred_delivery_days ?? []), d] }))}
              />
            );
          })}
        </View>
        <Input label="Notes (optional)" value={form.notes ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))} multiline />
      </Sheet>
    </Screen>
  );
}
