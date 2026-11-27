import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Logo, Text, goBack } from '@/components/ui';
import { radius, useLayout, useTheme } from '@/theme';

/** The web AuthCardWrapper: logo, title, subtitle, one white card on the grey page. */
export function AuthShell({ title, subtitle, children, footer, back = true, step }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; back?: boolean; step?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: gutter }}>
        <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', flex: 1, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
            {back ? <IconButton icon="arrow-back" label="Back" size={38} onPress={() => goBack('/')} /> : <View />}
            <Logo height={22} />
            <View style={{ width: 38 }} />
          </View>
          <View style={{ gap: 6, marginTop: 8 }}>
            {step ? <Text variant="overline">{step}</Text> : null}
            <Text variant="title">{title}</Text>
            {subtitle ? <Text variant="secondary">{subtitle}</Text> : null}
          </View>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 20, gap: 14 }}>{children}</View>
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
