import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, Glyph, ListSkeleton, Screen, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { titleCase } from '@/lib/format';
import { listRoles } from '@/services/admin';
import { useTheme } from '@/theme';

/** Roles & Permission (web /admin/roles): what each role can see and do. */
export default function AdminRoles() {
  const { colors } = useTheme();
  const q = useAsync(() => listRoles().then((r) => r.items ?? []), []);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen title="Roles & Permission" subtitle="What each role can see and do" refreshing={q.refreshing} onRefresh={q.refresh} backFallback="/admin">
      {q.loading ? (
        <ListSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState illustration="no-results" title="No roles yet" />
      ) : (
        (q.data ?? []).map((r) => {
          const expanded = open === r.id;
          return (
            <Card key={r.id} padding={0}>
              <Pressable onPress={() => setOpen(expanded ? null : r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text weight="semibold" color={colors.text}>
                      {r.name}
                    </Text>
                    {r.is_system ? <Badge label="System" /> : null}
                  </View>
                  {r.description ? <Text variant="caption">{r.description}</Text> : null}
                  <Text variant="caption">
                    {r.member_count} member{r.member_count === 1 ? '' : 's'} · {r.grants?.length ?? 0} modules
                  </Text>
                </View>
                <Glyph name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>
              {expanded ? (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 14, gap: 8 }}>
                  {(r.grants ?? []).map((g, i) => {
                    const actions = Array.isArray(g.actions)
                      ? g.actions
                      : (['view', 'create', 'edit', 'delete'] as const).filter((a) => (g as Record<string, unknown>)[a]);
                    return (
                      <View key={`${g.module}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Text size={13} color={colors.text} style={{ flex: 1 }}>
                          {titleCase(g.module)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {actions.map((a) => (
                            <Badge key={a} label={titleCase(a)} tone="brand" />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                  <Text variant="caption">Edit permissions from the web admin.</Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
