import { useMemo, useState } from 'react';

import { MenuSections } from '@/components/MenuSections';
import { EmptyState, Screen, SearchBar } from '@/components/ui';
import { ADMIN_MENU, hasStaffPermission } from '@/lib/nav';
import { useSession } from '@/store/session';

/** The admin side nav (web AppSidebar with ADMIN_NAV), filtered by the staff member's permissions. */
export default function AdminMenu() {
  const { permissions } = useSession();
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const allowed = ADMIN_MENU.filter((i) => hasStaffPermission(permissions, i.permission));
    const s = q.trim().toLowerCase();
    return s ? allowed.filter((i) => `${i.label} ${i.subtitle ?? ''} ${i.section ?? ''}`.toLowerCase().includes(s)) : allowed;
  }, [permissions, q]);
  return (
    <Screen title="Admin" subtitle="Every section you can open">
      <SearchBar value={q} onChangeText={setQ} placeholder="Find a section" />
      {items.length ? <MenuSections items={items} /> : <EmptyState illustration="no-results" title="No sections match" />}
    </Screen>
  );
}
