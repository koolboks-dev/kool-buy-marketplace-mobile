import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminList } from '@/components/admin/AdminList';
import { Button, Card, EmptyState, InfoRow, Screen, Sheet, SmartImage, StatusBadge, Text } from '@/components/ui';
import { ADMIN_RESOURCES, extractItems, extractPaging, rowImage, rowMoney, rowStatus, rowSubtitle, rowTitle } from '@/lib/admin-resources';
import { WEB_BASE_URL } from '@/lib/config';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { getAdminResource } from '@/services/admin';
import { radius, useTheme } from '@/theme';

type Row = Record<string, unknown>;

function display(k: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? (x as Row).name ?? (x as Row).label ?? JSON.stringify(x) : String(x))).join(', ') || '—';
  if (typeof v === 'object') {
    const o = v as Row;
    return String(o.name ?? o.label ?? o.business_name ?? o.title ?? JSON.stringify(o));
  }
  if (/(_at|date)$/.test(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) return formatDateTime(v);
  return String(v);
}

/** Generic admin module viewer, for every web admin page without a bespoke mobile screen. */
export default function AdminResourceScreen() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  const cfg = ADMIN_RESOURCES[resource];
  const { colors } = useTheme();
  const [open, setOpen] = useState<Row | null>(null);

  if (!cfg) {
    return (
      <Screen title="Admin">
        <EmptyState illustration="no-results" title="This section isn't available on mobile" />
      </Screen>
    );
  }

  const openWeb = () => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}${cfg.web}`);

  return (
    <>
      <AdminList<Row, string>
        title={cfg.title}
        subtitle={cfg.subtitle}
        searchPlaceholder="Search"
        deps={[resource]}
        tabs={cfg.tabs?.map((t) => ({ value: t.value || 'all', label: t.label }))}
        headerRight={<Button label="Web" icon="external" size="sm" variant="outline" onPress={openWeb} />}
        keyOf={(r) => String(r.id ?? r.public_id ?? r.serial ?? r.slug ?? r.key ?? JSON.stringify(r).slice(0, 40))}
        empty={{ title: 'Nothing here yet' }}
        fetchPage={async ({ page, q, tab }) => {
          const params: Record<string, string | number | undefined> = { page, page_size: 20, q: q || undefined, search: q || undefined };
          if (cfg.statusParam && tab && tab !== 'all') params[cfg.statusParam] = tab;
          const res = await getAdminResource(cfg.endpoint, params);
          const items = extractItems(res);
          return { items, ...extractPaging(res, page, items.length) };
        }}
        renderItem={(r) => {
          const status = rowStatus(r);
          const money = rowMoney(r);
          const img = rowImage(r);
          const sub = rowSubtitle(r);
          return (
            <Card onPress={() => setOpen(r)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {img ? <SmartImage uri={img} style={{ width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} /> : null}
              <View style={{ flex: 1, gap: 3 }}>
                <Text weight="semibold" color={colors.text} numberOfLines={1}>
                  {rowTitle(r)}
                </Text>
                {sub ? (
                  <Text variant="caption" numberOfLines={2}>
                    {sub}
                  </Text>
                ) : null}
                {r.created_at ? <Text variant="caption">{formatDateTime(String(r.created_at))}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {status ? <StatusBadge status={status} /> : null}
                {money ? (
                  <Text weight="semibold" size={13} color={colors.text}>
                    {formatMoney(money.value, String(r.currency ?? r.market ?? 'NG'))}
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        }}
      />
      <Sheet visible={Boolean(open)} onClose={() => setOpen(null)} title={open ? rowTitle(open) : ''} subtitle={cfg.title} footer={<Button label="Open in the web editor" icon="external" variant="outline" full onPress={openWeb} />}>
        {open ? (
          <>
            {rowImage(open) ? <SmartImage uri={rowImage(open)} contentFit="contain" style={{ width: '100%', height: 180, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} /> : null}
            <View>
              {Object.entries(open)
                .filter(([k]) => !/password|token|secret/i.test(k))
                .map(([k, v], i, arr) => (
                  <InfoRow key={k} label={titleCase(k)} value={display(k, v)} last={i === arr.length - 1} />
                ))}
            </View>
          </>
        ) : null}
      </Sheet>
    </>
  );
}
