import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, FilterTabs, Input, OtpInput, Text, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { dashboardPath } from '@/lib/nav';
import { loginEmailOtpRequest, loginEmailOtpVerify, loginWithPassword } from '@/services/auth';
import type { LoginResponse } from '@/services/types';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** Sign in with email/phone + password, or a one-time code sent to the email (web /login). */
export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useSession();
  const toast = useToast();
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (res: LoginResponse) => {
    const me = await signIn(res);
    if (res.must_change_password || me?.must_change_password) return router.replace('/change-password');
    if (res.needs_role_choice || me?.needs_role_choice) return router.replace('/choose-role');
    toast.show(`Welcome back${me?.first_name ? `, ${me.first_name}` : ''}`, 'success');
    const dest = dashboardPath(me?.role ?? res.role, me?.is_staff);
    router.replace((dest === '/account' ? '/(tabs)' : dest) as never);
  };

  const submitPassword = async () => {
    setError(null);
    if (!identifier.trim() || !password) return setError('Enter your email or phone number and your password.');
    setBusy(true);
    try {
      await finish(await loginWithPassword(identifier.trim(), password));
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      const res = await loginEmailOtpRequest(email.trim());
      setCodeSent(true);
      if (res.code) setCode(res.code);
      toast.show(res.message || 'Code sent — check your email.', 'success');
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (code.length !== 6) return setError('Enter the 6-digit code.');
    setBusy(true);
    try {
      await finish(await loginEmailOtpVerify(email.trim(), code));
    } catch (err) {
      setError(errorMessage(err, 'That code did not work.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to buy stock, manage your store or run the marketplace."
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text variant="secondary">New to KoolBuy?</Text>
          <Pressable onPress={() => router.push('/signup')} accessibilityRole="link">
            <Text variant="link">Create an account</Text>
          </Pressable>
        </View>
      }
    >
      <FilterTabs
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        tabs={[
          { value: 'password', label: 'Password' },
          { value: 'code', label: 'Email code' },
        ]}
      />
      {mode === 'password' ? (
        <>
          <Input label="Email or phone number" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoComplete="username" keyboardType="email-address" icon="mail" placeholder="you@business.com or 0803…" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" icon="lock" onSubmitEditing={submitPassword} returnKeyType="go" />
          <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end' }} accessibilityRole="link">
            <Text variant="link" size={13}>
              Forgot password?
            </Text>
          </Pressable>
          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}
          <Button label="Sign in" variant="primary" size="lg" full loading={busy} onPress={submitPassword} />
        </>
      ) : (
        <>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" icon="mail" editable={!codeSent} />
          {codeSent ? (
            <>
              <Text variant="label">Enter the 6-digit code</Text>
              <OtpInput value={code} onChange={setCode} />
              <Pressable onPress={sendCode} accessibilityRole="link">
                <Text variant="link" size={13}>
                  Resend code
                </Text>
              </Pressable>
            </>
          ) : null}
          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}
          <Button label={codeSent ? 'Verify and sign in' : 'Send code'} variant="primary" size="lg" full loading={busy} onPress={codeSent ? verifyCode : sendCode} />
        </>
      )}
    </AuthShell>
  );
}
