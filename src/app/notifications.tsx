import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppHeader, Button, EmptyState, ErrorState, FilterTabs, Glyph, ListSkeleton, Loader, Text, useToast, type GlyphName } from '@/components/ui';
import { usePaged } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationType } from '@/services/buyer';
import type { Notification } from '@/services/types';
import { useSession } from '@/store/session';
import { radius, useLayout, useTheme } from '@/theme';

const ICON: Record<string, GlyphName> = { order: 'receipt', payment: 'card', auth: 'lock', system: 'info', koolspace: 'layers' };

/** Map the web deep link to a mobile route (web lib/notification-href.ts). */
function openNotification(n: Notification, isStaff: boolean, isSeller: boolean) {
  const link = n.link ?? '';
  const id = n.entity_id ?? '';
  if (n.entity_type === 'order' || /orders/.test(link)) {
    if (isStaff && id) return router.push({ pathname: '/admin/order/[id]', params: { id } });
    if (isSeller) return router.push('/seller/orders');
    if (id) return router.push({ pathname: '/buyer/order/[id]', params: { id } });
    return router.push('/buyer/orders');
  }
  if (/deliver/.test(link)) return router.push(isStaff ? '/admin/deliveries' : isSeller ? '/seller/deliveries' : '/buyer/orders');
  if (/payment|transaction/.test(link)) return router.push(isStaff ? '/admin/transactions' : '/buyer/payments');
  if (/koolspace/.test(link)) return router.push('/(tabs)/koolspace');
  if (/invoice|financ/.test(link)) return router.push(isStaff ? '/admin/financing' : '/invoices');
  if (/onboarding/.test(link) && isStaff) return router.push('/admin/onboarding');
}

/** Notifications (web /buyer/notifications, /retailer/notifications). */
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { gutter, contentWidth } = useLayout();
  const { isStaff, isSeller } = useSession();
  const toast = useToast();
  const [type, setType] = useState<'all' | NotificationType>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);

  const list = usePaged<Notification>(async (page) => {
    const r = await getNotifications(page, 20, { type: type === 'all' ? undefined : type, is_read: unreadOnly ? false : undefined });
    setUnread(r.unread_count ?? null);
    const items = r.items ?? r.notifications ?? [];
    return { items, hasNext: Boolean(r.pagination?.has_next) };
  }, [type, unreadOnly]);

  const open = async (n: Notification) => {
    if (!n.is_read) {
      list.setItems((items) => items.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => (u ? u - 1 : u));
      markNotificationRead(n.id).catch(() => {});
    }
    openNotification(n, isStaff, isSeller);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Notifications"
        subtitle={unread != null ? `${unread} unread` : undefined}
        right={
          <Button
            label="Mark all read"
            size="sm"
            variant="ghost"
            onPress={async () => {
              try {
                await markAllNotificationsRead(type === 'all' ? undefined : type);
                list.refresh();
                toast.show('All caught up', 'success');
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              }
            }}
          />
        }
      />
      <FlatList
        data={list.items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: gutter, gap: 8, paddingBottom: 40, width: '100%', maxWidth: contentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        onEndReached={list.loadMore}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <FilterTabs
              value={type}
              onChange={setType}
              tabs={[
                { value: 'all', label: 'All' },
                { value: 'order', label: 'Orders' },
                { value: 'payment', label: 'Payments' },
                { value: 'koolspace', label: 'KoolSpace' },
                { value: 'system', label: 'System' },
              ]}
            />
            <FilterTabs
              value={unreadOnly ? 'unread' : 'all'}
              onChange={(v) => setUnreadOnly(v === 'unread')}
              tabs={[
                { value: 'all', label: 'Everything' },
                { value: 'unread', label: 'Unread', count: unread },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          list.loading ? <ListSkeleton rows={6} height={70} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : <EmptyState illustration="success" title="You're all caught up" description="New notifications will show up here." />
        }
        ListFooterComponent={list.loadingMore ? <Loader /> : undefined}
        renderItem={({ item: n }) => (
          <Pressable
            onPress={() => open(n)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 12,
              padding: 12,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: n.is_read ? colors.border : colors.brandSoft,
              backgroundColor: pressed ? colors.muted : n.is_read ? colors.surface : colors.brandSoft,
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name={ICON[n.type] ?? 'bell'} size={18} color={n.priority === 'critical' ? colors.danger : colors.text} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text weight={n.is_read ? 'medium' : 'semibold'} color={colors.text} style={{ flex: 1 }} numberOfLines={2}>
                  {n.title}
                </Text>
                <Text variant="caption">{timeAgo(n.created_at)}</Text>
              </View>
              {n.message || n.description ? (
                <Text variant="secondary" size={13} numberOfLines={3}>
                  {n.message || n.description}
                </Text>
              ) : null}
            </View>
            {!n.is_read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}
