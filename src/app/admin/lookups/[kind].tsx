import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminList } from '@/components/admin/AdminList';
import { Badge, Button, Card, Input, Sheet, Switch, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { createLookup, listLookups, LOOKUP_TITLES, updateLookup, type LookupItem, type LookupKind } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'all' | 'active' | 'hidden';

/** Categories / Business Types / Business Units / Freezer Sizes (web LookupManager). */
export default function AdminLookups() {
  const { kind } = useLocalSearchParams<{ kind: LookupKind }>();
  const meta = LOOKUP_TITLES[kind] ?? { title: 'Lookups', usage: 'Uses' };
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const canEdit = can(['catalogue.edit', 'catalogue.create', 'catalogue.*']);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <>
      <AdminList<LookupItem, Tab>
        title={meta.title}
        subtitle="Options shown across the marketplace"
        searchPlaceholder="Search"
        deps={[kind, version]}
        tabs={[
          { value: 'all', label: 'All', countKey: 'all' },
          { value: 'active', label: 'Shown', countKey: 'active' },
          { value: 'hidden', label: 'Hidden', countKey: 'hidden' },
        ]}
        headerRight={canEdit ? <Button label="Add" icon="plus" size="sm" variant="ink" onPress={() => setAdding(true)} /> : undefined}
        keyOf={(i) => i.slug}
        fetchPage={async ({ q, tab }) => {
          const r = await listLookups(kind, q || undefined);
          const items = (r.items ?? []).filter((i) => (tab === 'active' ? i.is_active : tab === 'hidden' ? !i.is_active : true));
          return { items, counts: r.counts, hasNext: false, total: items.length };
        }}
        renderItem={(i, { update }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text weight="semibold" color={colors.text}>
                {i.label}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Badge label={i.slug} />
                <Badge label={`${i.usage_count} ${meta.usage.toLowerCase()}`} />
                {i.is_catch_all ? <Badge label="Catch-all" tone="brand" /> : null}
                {i.vat_treatment ? <Badge label={`VAT: ${i.vat_treatment.replace(/_/g, ' ')}`} /> : null}
              </View>
            </View>
            {canEdit ? (
              <Switch
                value={i.is_active}
                onValueChange={async (v) => {
                  update((items) => items.map((x) => (x.slug === i.slug ? { ...x, is_active: v } : x)));
                  try {
                    await updateLookup(kind, i.slug, { is_active: v });
                  } catch (err) {
                    update((items) => items.map((x) => (x.slug === i.slug ? { ...x, is_active: !v } : x)));
                    toast.show(errorMessage(err), 'error');
                  }
                }}
              />
            ) : (
              <Badge label={i.is_active ? 'Shown' : 'Hidden'} tone={i.is_active ? 'success' : 'neutral'} />
            )}
          </Card>
        )}
      />
      <Sheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={`Add to ${meta.title.toLowerCase()}`}
        footer={
          <Button
            label="Add"
            variant="ink"
            full
            loading={saving}
            disabled={!label.trim()}
            onPress={async () => {
              setSaving(true);
              try {
                await createLookup(kind, { label: label.trim() });
                toast.show('Added', 'success');
                setLabel('');
                setAdding(false);
                setVersion((v) => v + 1);
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              } finally {
                setSaving(false);
              }
            }}
          />
        }
      >
        <Input label="Label" value={label} onChangeText={setLabel} placeholder="e.g. Frozen seafood" />
      </Sheet>
    </>
  );
}
