import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { dashboardPath } from '@/lib/nav';
import { changePassword } from '@/services/auth';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** Change password — also clears the forced change on a staff-invited temporary password. */
export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { user, refresh, signOut } = useSession();
  const forced = Boolean(user?.must_change_password);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!current) return setError('Enter your current password.');
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(current, next);
      const me = await refresh();
      toast.show('Password changed', 'success');
      if (me?.needs_role_choice) return router.replace('/choose-role');
      const dest = dashboardPath(me?.role, me?.is_staff);
      router.replace((dest === '/account' ? '/(tabs)/account' : dest) as never);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={forced ? 'Set your own password' : 'Change password'}
      subtitle={forced ? 'You signed in with a temporary password. Choose a new one to continue.' : 'Use at least 8 characters.'}
      back={!forced}
    >
      <Input label={forced ? 'Temporary password' : 'Current password'} value={current} onChangeText={setCurrent} secureTextEntry icon="lock" />
      <Input label="New password" value={next} onChangeText={setNext} secureTextEntry icon="lock" />
      <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry icon="lock" />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button label="Save password" variant="ink" size="lg" full loading={busy} onPress={submit} />
      {forced ? (
        <Button
          label="Sign out"
          variant="ghost"
          full
          onPress={() => {
            signOut();
            router.replace('/login');
          }}
        />
      ) : null}
    </AuthShell>
  );
}
