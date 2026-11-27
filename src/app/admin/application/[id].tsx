import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Badge, Button, Card, ErrorState, Glyph, InfoRow, Input, ListSkeleton, PromptSheet, Screen, Sheet, StatusBadge, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/format';
import { approveOnboarding, getOnboardingApplication, rejectOnboarding, requestOnboardingInfo } from '@/services/admin';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

const SKIP = new Set(['id', 'documents', 'history', 'applicant', 'store', 'purchase_capacity', 'status']);

/** One onboarding application (web /admin/onboarding/[id]). */
export default function AdminApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const q = useAsync(() => getOnboardingApplication(id).then((r) => r.application), [id]);
  const [sheet, setSheet] = useState<null | 'approve' | 'reject' | 'info'>(null);
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const a = q.data as Record<string, any> | null;
  const canDecide = can(['onboarding.approve', 'onboarding.edit', 'onboarding.*']);

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

  const docs: Record<string, any>[] = Array.isArray(a?.documents) ? a!.documents : [];
  const fields = a ? Object.entries(a).filter(([k, v]) => !SKIP.has(k) && v != null && v !== '' && (typeof v !== 'object' || Array.isArray(v))) : [];

  return (
    <Screen title={a?.business_name || 'Application'} subtitle="Onboarding review" narrow refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin/onboarding">
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error || !a ? (
        <ErrorState message={q.error ?? 'Application not found'} onRetry={q.refresh} />
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={a.status} />
              {a.applicant?.role ? <StatusBadge status={a.applicant.role} /> : null}
              {a.store?.is_live ? <Badge label="Store live" tone="success" /> : null}
            </View>
            {a.info_request_message ? (
              <Text variant="caption">
                Info requested {formatDateTime(a.info_requested_at)}: {a.info_request_message}
              </Text>
            ) : null}
          </Card>
          <Card padding={14}>
            <Text variant="subtitle" style={{ marginBottom: 4 }}>
              Applicant
            </Text>
            <InfoRow label="Name" value={a.applicant?.name} />
            <InfoRow label="Email" value={a.applicant?.email} />
            <InfoRow label="Phone" value={a.applicant?.phone} last />
            {a.applicant?.phone ? <Button label="Call applicant" icon="phone" size="sm" variant="outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${a.applicant.phone}`)} /> : null}
          </Card>
          <Card padding={14}>
            <Text variant="subtitle" style={{ marginBottom: 4 }}>
              Business details
            </Text>
            {fields.map(([k, v], i) => (
              <InfoRow key={k} label={titleCase(k)} value={Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : /_at$/.test(k) ? formatDateTime(String(v)) : String(v)} last={i === fields.length - 1} />
            ))}
          </Card>
          {docs.length ? (
            <Card style={{ gap: 8 }}>
              <Text variant="subtitle">Documents</Text>
              {docs.map((d, i) => {
                const url = d.url || d.file_url || d.image_url;
                return (
                  <Pressable
                    key={d.key ?? i}
                    disabled={!url}
                    onPress={() => url && Linking.openURL(url)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted }}
                  >
                    <Glyph name="document" size={18} color={colors.text} />
                    <Text style={{ flex: 1 }} color={colors.text} numberOfLines={1}>
                      {d.label ?? titleCase(d.key)}
                    </Text>
                    {url ? <Glyph name="external" size={16} color={colors.textMuted} /> : <Badge label="Missing" tone="warning" />}
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
          {Array.isArray(a.history) && a.history.length ? (
            <Card style={{ gap: 6 }}>
              <Text variant="subtitle">History</Text>
              {a.history.map((h: Record<string, any>, i: number) => (
                <View key={i}>
                  <Text weight="medium" color={colors.text}>
                    {titleCase(h.action ?? h.status)}
                  </Text>
                  <Text variant="caption">
                    {formatDateTime(h.created_at ?? h.at)}
                    {h.actor_name || h.actor ? ` · ${h.actor_name ?? h.actor?.name ?? h.actor}` : ''}
                  </Text>
                  {h.notes || h.note ? <Text variant="caption">{h.notes ?? h.note}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}
          {canDecide && !['approved', 'rejected'].includes(String(a.status)) ? (
            <View style={{ gap: 10 }}>
              <Button label="Approve" icon="check" variant="ink" full onPress={() => setSheet('approve')} />
              <Button label="Ask for more information" variant="outline" full onPress={() => setSheet('info')} />
              <Button label="Reject" variant="ghost" full onPress={() => setSheet('reject')} />
            </View>
          ) : null}
          <Sheet
            visible={sheet === 'approve'}
            onClose={() => setSheet(null)}
            title="Approve application"
            subtitle="The store goes live and ordering is switched on."
            footer={<Button label="Approve" variant="ink" full loading={busy} onPress={() => run(() => approveOnboarding(a.id, { approved_credit_limit: limit || undefined }), 'Application approved')} />}
          >
            <Input label="Credit limit (optional)" value={limit} onChangeText={(t) => setLimit(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
          </Sheet>
          <PromptSheet visible={sheet === 'info'} onClose={() => setSheet(null)} title="Ask for more information" label="Message to the applicant" minLength={5} confirmLabel="Send request" onConfirm={(m) => run(() => requestOnboardingInfo(a.id, m), 'Request sent')} />
          <PromptSheet visible={sheet === 'reject'} onClose={() => setSheet(null)} title="Reject application?" destructive minLength={5} confirmLabel="Reject" onConfirm={(m) => run(() => rejectOnboarding(a.id, m), 'Application rejected')} />
        </>
      )}
    </Screen>
  );
}
