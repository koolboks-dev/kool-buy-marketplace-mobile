import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, RadioList, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { chooseMarketplaceRole } from '@/services/auth';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** A KoolBuy Store customer's first marketplace sign-in (web /choose-role). */
export default function ChooseRoleScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { refresh } = useSession();
  const [role, setRole] = useState<'individual' | 'retailer' | 'wholesaler' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      const res = await chooseMarketplaceRole(role);
      await refresh();
      toast.show('Account updated', 'success');
      if (res.must_change_password) return router.replace('/change-password');
      router.replace(role === 'individual' ? '/(tabs)' : '/seller');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="How will you use the marketplace?" subtitle="You can buy as an individual, or set up a business account." back={false}>
      <RadioList
        value={role}
        onChange={setRole}
        options={[
          { value: 'individual', label: 'Individual', description: 'Buy for your home.' },
          { value: 'retailer', label: 'Retailer', description: 'Buy stock for your shop and sell to customers.' },
          { value: 'wholesaler', label: 'Wholesaler', description: 'Supply retailers in bulk.' },
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button label="Continue" variant="primary" size="lg" full disabled={!role} loading={busy} onPress={submit} />
    </AuthShell>
  );
}
