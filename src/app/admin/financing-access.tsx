import { useState } from 'react';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Button, Card, InfoRow, Input, PromptSheet, Sheet, StatusBadge, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { approveFinancingAccess, listFinancingAccounts, revokeFinancingAccess, type FinancingAccountRow } from '@/services/admin';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

type Tab = 'requested' | 'approved' | 'suspended' | 'declined' | 'all';

/** Inventory Financing (web /admin/financing-access): approve or revoke buyer access. */
export default function AdminFinancingAccess() {
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const [approve, setApprove] = useState<{ row: FinancingAccountRow; reload: () => void } | null>(null);
  const [revoke, setRevoke] = useState<{ row: FinancingAccountRow; reload: () => void } | null>(null);
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const canEdit = can(['credit.edit', 'credit.approve', 'credit.*']);

  return (
    <>
      <AdminList<FinancingAccountRow, Tab>
        title="Inventory Financing"
        subtitle="Approve or revoke buyer financing access"
        searchPlaceholder="Name, email or phone"
        tabs={[
          { value: 'requested', label: 'Requested', countKey: 'requested' },
          { value: 'approved', label: 'Approved', countKey: 'approved' },
          { value: 'suspended', label: 'Suspended', countKey: 'suspended' },
          { value: 'declined', label: 'Declined', countKey: 'declined' },
          { value: 'all', label: 'All', countKey: 'all' },
        ]}
        keyOf={(r) => r.user_id}
        empty={{ title: 'Nobody here' }}
        fetchPage={async ({ page, q, tab }) => {
          const r = await listFinancingAccounts({ page, search: q || undefined, status: tab === 'all' ? undefined : tab });
          return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
        }}
        renderItem={(r, { reload }) => (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text weight="semibold" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
                {r.name}
              </Text>
              <StatusBadge status={r.financing_access} />
            </View>
            <Text variant="caption">{r.email || r.phone}</Text>
            <InfoRow label="Credit limit" value={formatMoney(r.credit_limit, r.currency)} />
            <InfoRow label="Used" value={formatMoney(r.utilized, r.currency)} />
            <InfoRow label="Available" value={formatMoney(r.available, r.currency)} last />
            {canEdit ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Button
                  label={r.financing_access === 'approved' ? 'Change limit' : 'Approve'}
                  size="sm"
                  variant="ink"
                  onPress={() => {
                    setLimit(r.credit_limit && Number(r.credit_limit) > 0 ? String(r.credit_limit) : '');
                    setApprove({ row: r, reload });
                  }}
                />
                {r.financing_access === 'approved' ? <Button label="Revoke" size="sm" variant="outline" onPress={() => setRevoke({ row: r, reload })} /> : null}
              </View>
            ) : null}
          </Card>
        )}
      />
      <Sheet
        visible={Boolean(approve)}
        onClose={() => setApprove(null)}
        title="Approve financing"
        subtitle={approve?.row.name}
        footer={
          <Button
            label="Approve"
            variant="ink"
            full
            loading={busy}
            onPress={async () => {
              if (!approve) return;
              setBusy(true);
              try {
                await approveFinancingAccess(approve.row.user_id, { credit_limit: limit || undefined });
                toast.show('Financing approved', 'success');
                approve.reload();
                setApprove(null);
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
        }
      >
        <Input label={`Credit limit (${approve?.row.currency ?? 'NGN'})`} value={limit} onChangeText={(t) => setLimit(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" hint="Without a limit nothing is offered at checkout." />
      </Sheet>
      <PromptSheet
        visible={Boolean(revoke)}
        onClose={() => setRevoke(null)}
        title="Revoke financing?"
        description="Pay-later stops being offered to this customer."
        destructive
        minLength={3}
        confirmLabel="Revoke"
        onConfirm={async (reason) => {
          if (!revoke) return;
          try {
            await revokeFinancingAccess(revoke.row.user_id, reason);
            toast.show('Financing revoked', 'success');
            revoke.reload();
            setRevoke(null);
          } catch (err) {
            toast.show(errorMessage(err), 'error');
          }
        }}
      />
    </>
  );
}
