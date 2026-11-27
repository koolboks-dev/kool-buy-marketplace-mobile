import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Chip, Input, OtpInput, Select, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { ILLUSTRATIONS } from '@/lib/brand-svg';
import { dialCode } from '@/lib/format';
import {
  buyerRegisterEmail,
  buyerRegisterPasswordPhone,
  buyerVerifyEmail,
  completeSellerProfile,
  listBusinessTypes,
  vendorRegisterEmail,
  vendorSetPassword,
  vendorVerifyEmail,
} from '@/services/auth';
import { listProductCategories } from '@/services/catalog';
import { useSession } from '@/store/session';
import { radius, useTheme } from '@/theme';

type Role = 'individual' | 'retailer' | 'wholesaler';
type Step = 'role' | 'info' | 'otp' | 'password' | 'business';

const MARKET = 'NG';

function fullPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  if (raw.trim().startsWith('+')) return `+${digits}`;
  return `${dialCode(MARKET)}${digits.replace(/^0/, '')}`;
}

/**
 * Sign-up (web /signup): choose Individual / Retailer / Wholesaler, then
 * email → email code → password; businesses then add their store details.
 */
export default function SignupScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { signIn } = useSession();
  const initialRole: Role | null = params.role === 'wholesaler' ? 'wholesaler' : params.role === 'retailer' || params.role === 'seller' ? 'retailer' : null;
  const [role, setRole] = useState<Role | null>(initialRole);
  const [step, setStep] = useState<Step>(initialRole ? 'info' : 'role');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [token, setToken] = useState<{ access: string; refresh: string } | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [address, setAddress] = useState('');
  const [selling, setSelling] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVendor = role === 'retailer' || role === 'wholesaler';
  const types = useAsync(() => listBusinessTypes().then((r) => r.items ?? []), [], { skip: !isVendor });
  const categories = useAsync(() => listProductCategories().then((r) => r.items ?? []), [], { skip: !isVendor });

  const names = () => {
    const parts = fullName.trim().split(/\s+/);
    return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') };
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = () =>
    run(async () => {
      if (!isVendor) {
        const { first_name, last_name } = names();
        if (!first_name || !last_name) throw new Error('Please enter both first and last name.');
      }
      if (!email.includes('@')) throw new Error('Please enter a valid email address.');
      const ph = fullPhone(phone);
      const res = isVendor
        ? await vendorRegisterEmail({ email: email.trim(), phone_number: ph, market: MARKET, role: role as 'retailer' | 'wholesaler' })
        : await buyerRegisterEmail({ ...names(), email: email.trim(), phone_number: ph, market: MARKET, role: 'individual' });
      if (res.code) setCode(res.code);
      toast.show(res.message || 'Verification code sent!', 'success');
      setStep('otp');
    });

  const verifyEmail = () =>
    run(async () => {
      if (code.length !== 6) throw new Error('Please enter the full 6-digit code.');
      const ph = fullPhone(phone);
      const res = isVendor
        ? await vendorVerifyEmail({ email: email.trim(), code, phone_number: ph, market: MARKET, role: role as 'retailer' | 'wholesaler' })
        : await buyerVerifyEmail({ email: email.trim(), code, ...names(), phone_number: ph, market: MARKET, role: 'individual' });
      if (!res.access) throw new Error('Verification did not return a session. Please try again.');
      setToken({ access: res.access, refresh: res.refresh ?? '' });
      toast.show('Verified successfully!', 'success');
      setStep('password');
    });

  const savePassword = () =>
    run(async () => {
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');
      if (password !== confirm) throw new Error('Passwords do not match.');
      if (!token) throw new Error('Session expired. Please restart registration.');
      if (isVendor) {
        await vendorSetPassword(password, token.access);
        await signIn({ access: token.access, refresh: token.refresh });
        setStep('business');
        return;
      }
      await buyerRegisterPasswordPhone({ password, phone_number: fullPhone(phone) ?? '', market: MARKET }, token.access);
      await signIn({ access: token.access, refresh: token.refresh });
      toast.show('Registration complete! Welcome to KoolBuy.', 'success');
      router.replace('/(tabs)');
    });

  const createStore = () =>
    run(async () => {
      if (!businessName.trim()) throw new Error('Enter your business name.');
      if (!address.trim()) throw new Error('Enter your store address.');
      if (selling.length === 0) throw new Error('Select at least one category you will sell.');
      if (!token) throw new Error('Session expired. Please sign in to finish.');
      await completeSellerProfile(
        {
          role: role as 'retailer' | 'wholesaler',
          business_name: businessName.trim(),
          business_type: businessType || (role as string),
          store_address: address.trim(),
          market: MARKET,
          selling_categories: selling,
        },
        token.access,
      );
      await signIn({ access: token.access, refresh: token.refresh });
      toast.show('Vendor account created successfully!', 'success');
      router.replace('/seller');
    });

  const err = error ? (
    <Text variant="caption" color={colors.danger}>
      {error}
    </Text>
  ) : null;

  const footer = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
      <Text variant="secondary">Already have an account?</Text>
      <Pressable onPress={() => router.replace('/login')} accessibilityRole="link">
        <Text variant="link">Sign in</Text>
      </Pressable>
    </View>
  );

  if (step === 'role') {
    const options: { value: Role; title: string; desc: string; art: 'role-buyer' | 'role-seller' }[] = [
      { value: 'individual', title: 'Individual', desc: 'Buy fresh and frozen food for your home.', art: 'role-buyer' },
      { value: 'retailer', title: 'Retailer', desc: 'Run a shop: buy stock, sell to customers and own a solar freezer.', art: 'role-seller' },
      { value: 'wholesaler', title: 'Wholesaler', desc: 'Supply retailers in bulk across the marketplace.', art: 'role-seller' },
    ];
    return (
      <AuthShell title="Create your account" subtitle="How will you use KoolBuy Marketplace?" footer={footer}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setRole(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: role === o.value }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: role === o.value ? colors.brand : colors.border,
              backgroundColor: role === o.value ? colors.brandSoft : colors.surface,
            }}
          >
            <SvgXml xml={ILLUSTRATIONS[o.art]} width={64} height={48} />
            <View style={{ flex: 1 }}>
              <Text variant="subtitle">{o.title}</Text>
              <Text variant="caption">{o.desc}</Text>
            </View>
          </Pressable>
        ))}
        <Button label="Continue" variant="primary" size="lg" full disabled={!role} onPress={() => setStep('info')} />
      </AuthShell>
    );
  }

  if (step === 'info') {
    return (
      <AuthShell step={isVendor ? 'Step 1 of 4' : 'Step 1 of 3'} title={isVendor ? 'Your business email' : 'Your details'} subtitle="We'll send a code to confirm your email." footer={footer}>
        {!isVendor ? <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="First and last name" icon="user" autoComplete="name" /> : null}
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" icon="mail" autoComplete="email" />
        <Input label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="phone" placeholder="0803 000 0000" hint="Nigeria (+234). Start with + for another country." />
        {err}
        <Button label="Send verification code" variant="primary" size="lg" full loading={busy} onPress={sendEmail} />
        <Button label="Change account type" variant="ghost" full onPress={() => setStep('role')} />
      </AuthShell>
    );
  }

  if (step === 'otp') {
    return (
      <AuthShell step={isVendor ? 'Step 2 of 4' : 'Step 2 of 3'} title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}.`} footer={footer}>
        <OtpInput value={code} onChange={setCode} />
        {err}
        <Button label="Verify" variant="primary" size="lg" full loading={busy} onPress={verifyEmail} />
        <Button label="Resend code" variant="ghost" full onPress={sendEmail} />
      </AuthShell>
    );
  }

  if (step === 'password') {
    return (
      <AuthShell step={isVendor ? 'Step 3 of 4' : 'Step 3 of 3'} title="Create a password" subtitle="At least 8 characters." footer={footer} back={false}>
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry icon="lock" autoComplete="new-password" />
        <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry icon="lock" />
        {err}
        <Button label={isVendor ? 'Continue' : 'Create account'} variant="primary" size="lg" full loading={busy} onPress={savePassword} />
      </AuthShell>
    );
  }

  return (
    <AuthShell step="Step 4 of 4" title="Your store" subtitle="Tell buyers who you are. You can finish onboarding later." back={false}>
      <Input label="Business name" value={businessName} onChangeText={setBusinessName} icon="store" />
      <Select
        label="Type of business"
        value={businessType}
        placeholder={role === 'wholesaler' ? 'Wholesaler' : 'Retailer'}
        options={(types.data ?? []).map((t) => ({ value: t.value, label: t.label }))}
        onChange={setBusinessType}
      />
      <Input label="Store address" value={address} onChangeText={setAddress} icon="location" multiline placeholder="Street, area, city, state" />
      <Text variant="label">What will you sell?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(categories.data ?? []).map((c) => (
          <Chip key={c.value} label={c.label} active={selling.includes(c.value)} onPress={() => setSelling((s) => (s.includes(c.value) ? s.filter((x) => x !== c.value) : [...s, c.value]))} />
        ))}
      </View>
      {err}
      <Button label="Create vendor account" variant="primary" size="lg" full loading={busy} onPress={createStore} />
    </AuthShell>
  );
}
