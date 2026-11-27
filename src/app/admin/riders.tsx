import { Linking, View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Avatar, Badge, Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { listRiders } from '@/services/admin';

type Rider = Record<string, any>;

/** Riders (web /admin/riders): availability and current load. */
export default function AdminRiders() {
  const { colors } = useTheme();
  return (
    <AdminList<Rider, 'all'>
      title="Riders"
      subtitle="Riders, their availability and current load"
      searchPlaceholder="Name, phone or code"
      keyOf={(r) => String(r.id)}
      illustration="cold-chain-delivery"
      empty={{ title: 'No riders yet' }}
      fetchPage={async ({ page, q }) => {
        const r = await listRiders({ page, search: q || undefined });
        return { items: r.items ?? [], ...pageInfo(r.pagination, page, r.items?.length ?? 0, 30) };
      }}
      renderItem={(r) => (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={r.photo_url} name={r.name} size={42} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={colors.text}>
                {r.name}
              </Text>
              <Text variant="caption">
                {r.rider_code ? `${r.rider_code} · ` : ''}
                {[r.vehicle_type, r.vehicle_brand, r.vehicle_registration].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {r.is_online ? <Badge label="Online" tone="success" dot /> : <Badge label="Offline" dot />}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {r.is_active === false ? <Badge label="Inactive" tone="danger" /> : <Badge label="Active" tone="success" />}
            {r.is_available ? <Badge label="Available" tone="brand" /> : null}
            {r.active_deliveries != null ? <Badge label={`${r.active_deliveries} active`} /> : null}
            {(r.service_states ?? []).slice(0, 3).map((s: string) => (
              <Badge key={s} label={s} />
            ))}
          </View>
          {r.phone ? <Button label="Call" icon="phone" size="sm" variant="outline" style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${r.phone}`)} /> : null}
        </Card>
      )}
    />
  );
}
