import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Avatar, Badge, Button, Card, ErrorState, InfoRow, ListSkeleton, PromptSheet, Screen, SmartImage, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/format';
import { getAdminSeller, reactivateAdminSeller, suspendAdminSeller, updateAdminSeller } from '@/services/admin';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

/** Seller detail (web /admin/sellers/[id]): verify, change role, suspend / reactivate. */
export default function AdminSellerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getAdminSeller(id).then((r) => r.seller), [id]);
  const [sheet, setSheet] = useState<null | 'suspend' | 'reactivate' | 'role'>(null);
  const [busy, setBusy] = useState(false);
  const s = q.data;
  const canEdit = can(['stores.edit', 'stores.*']);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.show(ok, 'success');
      setSheet(null);
      q.reload();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={s?.business_name ?? 'Seller'} subtitle="Seller" narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/sellers">
      {q.loading ? (
        <ListSkeleton rows={3} />
      ) : q.error || !s ? (
        <ErrorState message={q.error ?? 'Seller not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <Avatar uri={s.logo_url} name={s.business_name} size={68} />
            <Text variant="heading" align="center">
              {s.business_name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {s.role ? <StatusBadge status={s.role} /> : null}
              <StatusBadge status={s.is_verified} />
              {s.suspended_at ? <Badge label="Suspended" tone="danger" /> : <StatusBadge status={s.is_active ? 'active' : 'inactive'} />}
              <Badge label={s.is_open ? 'Open' : 'Closed'} />
            </View>
          </Card>
          {s.suspended_at ? (
            <Card muted>
              <Text weight="semibold" color={colors.dangerText}>
                Suspended {formatDateTime(s.suspended_at)}
              </Text>
              {s.suspension_reason ? <Text variant="caption">{s.suspension_reason}</Text> : null}
            </Card>
          ) : null}
          <Card padding={14}>
            <InfoRow label="Business type" value={titleCase(s.business_type)} />
            <InfoRow label="Email" value={s.email} icon="mail" />
            <InfoRow label="Phone" value={s.phone} icon="phone" />
            <InfoRow label="WhatsApp" value={s.whatsapp_number} icon="whatsapp" />
            <InfoRow label="Address" value={s.address} icon="location" />
            <InfoRow label="Products" value={s.product_count} />
            <InfoRow label="Orders" value={s.order_count} />
            <InfoRow label="Rating" value={s.rating ? s.rating.toFixed(1) : '—'} />
            <InfoRow label="Joined" value={formatDateTime(s.created_at)} last />
          </Card>
          {s.description ? (
            <Card style={{ gap: 4 }}>
              <Text variant="subtitle">About</Text>
              <Text>{s.description}</Text>
            </Card>
          ) : null}
          {s.cac_image_url ? (
            <Card style={{ gap: 8 }}>
              <Text variant="subtitle">Registration document</Text>
              <SmartImage uri={s.cac_image_url} contentFit="contain" style={{ width: '100%', height: 220, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} />
              <Button label="Open full size" variant="outline" size="sm" icon="external" style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openURL(s.cac_image_url)} />
            </Card>
          ) : null}
          {s.status_history?.length ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">History</Text>
              {s.status_history.map((h, i) => (
                <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, paddingTop: i ? 8 : 0 }}>
                  <Text weight="medium" color={colors.text}>
                    {titleCase(h.action)}
                  </Text>
                  <Text variant="caption">
                    {formatDateTime(h.created_at)}
                    {h.actor_name ? ` · ${h.actor_name}` : ''}
                  </Text>
                  {h.reason ? <Text variant="caption">{h.reason}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}
          <Button label="View storefront" icon="store" variant="outline" full onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: s.id } })} />
          {canEdit ? (
            <View style={{ gap: 10 }}>
              <Button
                label={s.is_verified ? 'Remove verification' : 'Verify seller'}
                icon="shield"
                variant={s.is_verified ? 'outline' : 'ink'}
                full
                loading={busy}
                onPress={() => run(() => updateAdminSeller(s.id, { is_verified: !s.is_verified }), s.is_verified ? 'Verification removed' : 'Seller verified')}
              />
              <Button label={`Change to ${s.role === 'wholesaler' ? 'retailer' : 'wholesaler'}`} variant="outline" full onPress={() => setSheet('role')} />
              {s.suspended_at ? (
                <Button label="Reactivate store" variant="ink" full onPress={() => setSheet('reactivate')} />
              ) : (
                <Button label="Suspend store" variant="destructive" full onPress={() => setSheet('suspend')} />
              )}
            </View>
          ) : null}
          <PromptSheet
            visible={sheet === 'suspend'}
            onClose={() => setSheet(null)}
            title="Suspend this store?"
            description="Buyers can no longer order from it. The seller is told why."
            minLength={5}
            destructive
            confirmLabel="Suspend"
            onConfirm={(reason) => run(() => suspendAdminSeller(s.id, reason), 'Store suspended')}
          />
          <PromptSheet
            visible={sheet === 'reactivate'}
            onClose={() => setSheet(null)}
            title="Reactivate this store?"
            label="Note (optional)"
            required={false}
            confirmLabel="Reactivate"
            onConfirm={(note) => run(() => reactivateAdminSeller(s.id, note || undefined), 'Store reactivated')}
          />
          <PromptSheet
            visible={sheet === 'role'}
            onClose={() => setSheet(null)}
            title={`Change to ${s.role === 'wholesaler' ? 'retailer' : 'wholesaler'}?`}
            description="Their dashboard, pricing and menu change with the role."
            required={false}
            confirmLabel="Change role"
            onConfirm={(reason) => run(() => updateAdminSeller(s.id, { role: s.role === 'wholesaler' ? 'retailer' : 'wholesaler', reason: reason || undefined }), 'Role changed')}
          />
        </>
      )}
    </Screen>
  );
}
