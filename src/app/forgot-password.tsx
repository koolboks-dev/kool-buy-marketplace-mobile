import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, OtpInput, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { forgotPasswordRequest, forgotPasswordReset } from '@/services/auth';
import { useTheme } from '@/theme';

/** Forgot password (web /forgot-password): email → code + new password. */
export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      const res = await forgotPasswordRequest(email.trim());
      if (res.code) setCode(res.code);
      setSent(true);
      toast.show(res.message || 'If that email has an account, a code is on its way.', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    if (code.length !== 6) return setError('Enter the 6-digit code.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await forgotPasswordReset(email.trim(), code, password);
      toast.show('Password changed — sign in with your new password.', 'success');
      router.replace('/login');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle={sent ? `Enter the code we sent to ${email} and choose a new password.` : "Enter your account email and we'll send you a code."}>
      {!sent ? (
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" icon="mail" />
      ) : (
        <>
          <OtpInput value={code} onChange={setCode} />
          <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry icon="lock" />
          <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry icon="lock" />
        </>
      )}
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button label={sent ? 'Reset password' : 'Send code'} variant="primary" size="lg" full loading={busy} onPress={sent ? reset : send} />
      {sent ? <Button label="Resend code" variant="ghost" full onPress={send} /> : null}
    </AuthShell>
  );
}
