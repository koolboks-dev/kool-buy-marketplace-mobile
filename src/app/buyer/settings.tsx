import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, ListRow, RadioList, Screen, SwitchRow, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { deleteBuyerAccount, getBuyerProfile, getFinancingAccess, requestFinancingAccess, updateBuyerPreferences } from '@/services/buyer';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme';

/** Settings (web /buyer/settings): contact preference, notifications, financing, password, delete account. */
export default function BuyerSettings() {
  const { colors } = useTheme();
  const toast = useToast();
  const { signOut } = useSession();
  const profile = useAsync(() => getBuyerProfile(), []);
  const financing = useAsync(() => getFinancingAccess().catch(() => null), []);
  const [contactEdit, setContact] = useState<'phone' | 'whatsapp' | null>(null);
  const [pushEdit, setPush] = useState<boolean | null>(null);
  const contact = contactEdit ?? (profile.data?.contact_preference === 'whatsapp' ? 'whatsapp' : 'phone');
  const push = pushEdit ?? Boolean(profile.data?.push_notifications_enabled ?? true);

  const savePref = async (body: Parameters<typeof updateBuyerPreferences>[0]) => {
    try {
      await updateBuyerPreferences(body);
      toast.show('Saved', 'success');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    }
  };

  const fa = financing.data as Record<string, any> | null;
  const faState = String(fa?.financing_access ?? 'not_requested');

  return (
    <Screen title="Settings" narrow>
      <Card style={{ gap: 10 }}>
        <Text variant="subtitle">How vendors contact you</Text>
        <RadioList
          value={contact}
          onChange={(v) => {
            setContact(v);
            savePref({ contact_preference: v });
          }}
          options={[
            { value: 'phone', label: 'Phone call' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ]}
        />
      </Card>
      <Card padding={14}>
        <SwitchRow
          label="Push notifications"
          description="Order updates, payments and deliveries"
          value={push}
          onValueChange={(v) => {
            setPush(v);
            savePref({ push_notifications_enabled: v });
          }}
          last
        />
      </Card>
      <Card style={{ gap: 8 }}>
        <Text variant="subtitle">Inventory financing</Text>
        <Text variant="secondary" size={13}>
          {faState === 'approved'
            ? `Approved. Available credit: ${fa?.available ?? '—'}`
            : faState === 'requested'
              ? 'Your request is with our credit team.'
              : faState === 'declined' || faState === 'suspended'
                ? 'Financing is not available on your account right now.'
                : 'Stock up now and pay later. Request access and our team will review your account.'}
        </Text>
        {faState === 'not_requested' ? (
          <Button
            label="Request financing access"
            variant="outline"
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            onPress={async () => {
              try {
                await requestFinancingAccess();
                financing.reload();
                toast.show('Request sent', 'success');
              } catch (err) {
                toast.show(errorMessage(err), 'error');
              }
            }}
          />
        ) : null}
      </Card>
      <Card padding={0}>
        <ListRow icon="lock" title="Change password" onPress={() => router.push('/change-password')} />
        <ListRow icon="location" title="Delivery addresses" onPress={() => router.push('/buyer/addresses')} last />
      </Card>
      <Card style={{ gap: 8, borderColor: colors.dangerSoft }}>
        <Text variant="subtitle" color={colors.dangerText}>
          Delete account
        </Text>
        <Text variant="caption">This permanently removes your account, saved stores and addresses.</Text>
        <Button
          label="Delete my account"
          variant="destructive"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() =>
            Alert.alert('Delete your account?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteBuyerAccount();
                    signOut();
                    router.replace('/(tabs)');
                  } catch (err) {
                    toast.show(errorMessage(err), 'error');
                  }
                },
              },
            ])
          }
        />
      </Card>
    </Screen>
  );
}
