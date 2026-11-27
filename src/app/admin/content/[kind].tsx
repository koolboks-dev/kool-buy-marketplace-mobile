import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, View } from 'react-native';

import { AdminList } from '@/components/admin/AdminList';
import { Badge, Button, Card, SmartImage, Switch, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { WEB_BASE_URL } from '@/lib/config';
import { deleteContent, listContent, updateContent, type ContentKind } from '@/services/admin';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

const META: Record<ContentKind, { title: string; subtitle: string }> = {
  'hero-banners': { title: 'Hero Banners', subtitle: 'Market page hero slider images, animation and duration' },
  'homepage-stats': { title: 'Homepage Stats', subtitle: 'Counter metrics shown below the homepage hero banner' },
  'homepage-offers': { title: 'Homepage Offers', subtitle: 'The offer cards shown after the homepage stats' },
  'popular-categories': { title: 'Popular Categories', subtitle: 'Homepage cards — exactly as shoppers see them' },
};

type Row = Record<string, any>;

/** Homepage content managers (web HeroBannersManager, HomepageStatsManager, …): show/hide, reorder view, delete. */
export default function AdminContent() {
  const { kind } = useLocalSearchParams<{ kind: ContentKind }>();
  const meta = META[kind] ?? { title: 'Content', subtitle: '' };
  const { colors } = useTheme();
  const toast = useToast();
  const { can } = useSession();
  const canEdit = can(['storefront.edit', 'storefront.*']);

  const title = (r: Row) =>
    kind === 'homepage-stats' ? `${r.prefix ?? ''}${Number(r.target ?? 0).toLocaleString()}${r.suffix ?? ''} · ${r.label}` : r.title || r.label || 'Untitled';

  return (
    <AdminList<Row, 'all'>
      title={meta.title}
      subtitle={meta.subtitle}
      deps={[kind]}
      keyOf={(r) => String(r.id)}
      headerRight={<Button label="Web editor" icon="external" size="sm" variant="outline" onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/admin/${kind}`)} />}
      empty={{ title: 'Nothing here yet', description: 'Add items from the web editor; they show up here to manage.' }}
      fetchPage={async () => {
        const r = await listContent(kind);
        const items = [...(r.items ?? r.offers ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return { items, hasNext: false, total: items.length };
      }}
      renderItem={(r, { update }) => (
        <Card style={{ gap: 10 }}>
          {r.image_url ? <SmartImage uri={r.image_url} style={{ width: '100%', height: 140, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text weight="semibold" color={colors.text}>
                {title(r)}
              </Text>
              {r.subtitle || r.description || r.tagline || r.subtext ? (
                <Text variant="caption" numberOfLines={2}>
                  {r.subtitle || r.description || r.tagline || r.subtext}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Badge label={`#${(r.sort_order ?? 0) + 1}`} />
                {r.duration ? <Badge label={`${Math.round(r.duration / 1000)}s`} icon="clock" /> : null}
                {r.animation ? <Badge label={String(r.animation)} /> : null}
                {r.category_slug ? <Badge label={r.category_slug} /> : null}
                {r.is_highlighted ? <Badge label="Highlighted" tone="brand" /> : null}
              </View>
            </View>
            {canEdit ? (
              <Switch
                value={r.is_active !== false}
                onValueChange={async (v) => {
                  update((items) => items.map((x) => (x.id === r.id ? { ...x, is_active: v } : x)));
                  try {
                    await updateContent(kind, String(r.id), { is_active: v });
                  } catch (err) {
                    update((items) => items.map((x) => (x.id === r.id ? { ...x, is_active: !v } : x)));
                    toast.show(errorMessage(err), 'error');
                  }
                }}
              />
            ) : (
              <Badge label={r.is_active !== false ? 'Live' : 'Hidden'} tone={r.is_active !== false ? 'success' : 'neutral'} />
            )}
          </View>
          {canEdit ? (
            <Button
              label="Delete"
              icon="trash"
              size="sm"
              variant="ghost"
              style={{ alignSelf: 'flex-start' }}
              onPress={() =>
                Alert.alert('Delete this item?', 'It is removed from the homepage.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteContent(kind, String(r.id));
                        update((items) => items.filter((x) => x.id !== r.id));
                      } catch (err) {
                        toast.show(errorMessage(err), 'error');
                      }
                    },
                  },
                ])
              }
            />
          ) : null}
        </Card>
      )}
    />
  );
}
