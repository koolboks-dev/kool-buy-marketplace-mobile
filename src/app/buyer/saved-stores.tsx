import { router } from 'expo-router';

import { VendorRow } from '@/components/marketplace/VendorCard';
import { EmptyState, ErrorState, IconButton, ListSkeleton, Screen, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { listSavedStores } from '@/services/buyer';
import { removeVendorFromFavorites } from '@/services/catalog';
import { useTheme } from '@/theme';

/** Saved stores (web /buyer/stores). */
export default function SavedStores() {
  const { colors } = useTheme();
  const toast = useToast();
  const q = useAsync(() => listSavedStores().then((r) => r.items ?? []), []);
  const items = q.data ?? [];
  return (
    <Screen title="Saved stores" subtitle={items.length ? `${items.length} stores` : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <ListSkeleton rows={4} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refresh} />
      ) : items.length === 0 ? (
        <EmptyState illustration="no-vendors" title="No saved stores" description="Tap the heart on a store to save it here." action="Browse stores" onAction={() => router.push('/(tabs)/browse')} />
      ) : (
        items.map((s) => {
          const v = { id: String(s.id ?? s.vendor_id ?? s.seller_id), name: s.name ?? s.business_name, image_url: s.image_url ?? s.logo_url, location_label: s.location_label, address: s.address, rating: s.rating, review_count: s.review_count };
          return (
            <VendorRow
              key={v.id}
              v={v}
              right={
                <IconButton
                  icon="heart-filled"
                  color={colors.brand}
                  tone="ghost"
                  label="Remove from saved"
                  onPress={async () => {
                    try {
                      await removeVendorFromFavorites(v.id);
                      q.reload();
                    } catch (err) {
                      toast.show(errorMessage(err), 'error');
                    }
                  }}
                />
              }
            />
          );
        })
      )}
    </Screen>
  );
}
