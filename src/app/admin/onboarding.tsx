import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminList, pageInfo } from '@/components/admin/AdminList';
import { Badge, Card, ProgressBar, StatusBadge, Text } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { listOnboardingApplications, type AdminOnboardingSummary } from '@/services/admin';
import { useTheme } from '@/theme';

type Tab = 'pending' | 'needs_info' | 'approved' | 'rejected' | 'draft' | 'all';

/** Onboarding Review (web /admin/onboarding): check documents, approve stores to go live. */
export default function AdminOnboarding() {
  const { colors } = useTheme();
  return (
    <AdminList<AdminOnboardingSummary, Tab>
      title="Onboarding Review"
      subtitle="Check vendor documents and approve stores"
      searchPlaceholder="Business, owner or email"
      tabs={[
        { value: 'pending', label: 'To review', countKey: 'pending' },
        { value: 'needs_info', label: 'Needs info', countKey: 'needs_info' },
        { value: 'approved', label: 'Approved', countKey: 'approved' },
        { value: 'rejected', label: 'Rejected', countKey: 'rejected' },
        { value: 'draft', label: 'Draft', countKey: 'draft' },
        { value: 'all', label: 'All', countKey: 'all' },
      ]}
      keyOf={(a) => a.id}
      empty={{ title: 'No applications here' }}
      fetchPage={async ({ page, q, tab }) => {
        const r = await listOnboardingApplications({ page, q: q || undefined, status: tab === 'all' ? undefined : tab });
        return { items: r.items ?? [], counts: r.counts, ...pageInfo(r.pagination, page, r.items?.length ?? 0) };
      }}
      renderItem={(a) => (
        <Card onPress={() => router.push({ pathname: '/admin/application/[id]', params: { id: a.id } })} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={colors.text} numberOfLines={1}>
                {a.business_name || 'Unnamed business'}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {a.owner_full_name || a.applicant_name} · {a.applicant_email || a.applicant_phone}
              </Text>
            </View>
            <StatusBadge status={a.status} />
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="caption">
              Documents {a.documents_uploaded}/{a.documents_total}
            </Text>
            <ProgressBar value={a.documents_total ? a.documents_uploaded / a.documents_total : 0} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={a.role} />
            {a.business_type ? <Badge label={a.business_type} /> : null}
            {a.market ? <Badge label={a.market} /> : null}
            {a.store_live ? <Badge label="Store live" tone="success" /> : null}
            {a.submitted_at ? <Badge label={`Submitted ${formatDate(a.submitted_at)}`} /> : null}
          </View>
        </Card>
      )}
    />
  );
}
