import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph, type GlyphName } from '@/components/icons/Glyph';
import { font, radius, useTheme } from '@/theme';

import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: GlyphName;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
}

/** DESIGN.md: white, 1px ash-200, 12px radius; focus border orange with the soft ring. */
export const Input = forwardRef<ComponentRef<typeof TextInput>, Props>(function Input(
  { label, hint, error, icon, right, containerStyle, secureTextEntry, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const borderColor = error ? colors.danger : focused ? colors.brand : colors.border;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 96 : 46,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          gap: 8,
          ...(focused && !error ? { shadowColor: colors.brand, shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } } : null),
        }}
      >
        {icon ? (
          <View style={{ paddingTop: multiline ? 12 : 0 }}>
            <Glyph name={icon} size={18} color={colors.textMuted} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              fontFamily: font.regular,
              fontSize: 15,
              color: colors.text,
              paddingVertical: multiline ? 12 : 10,
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 96 : undefined,
            },
            style,
          ]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Glyph name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});

/** Search field with clear button. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onSubmit,
  style,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height: 44,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          gap: 8,
        },
        style,
      ]}
    >
      <Glyph name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.text, paddingVertical: 8 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Glyph name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Six-box OTP entry (one hidden input). */
export function OtpInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', opacity: 0.01, width: '100%', height: 54, zIndex: 2 }}
        accessibilityLabel="Verification code"
      />
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 54,
                maxWidth: 56,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="title">{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
