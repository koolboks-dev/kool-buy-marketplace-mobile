import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph } from '@/components/icons/Glyph';
import { radius, shadow, useTheme } from '@/theme';

import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';

/** Bottom sheet (modals in DESIGN may use shadow-xl). */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, 12),
            width: '100%',
            maxWidth: 720,
            alignSelf: 'center',
            ...shadow.sheet,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{title}</Text>
                {subtitle ? <Text variant="caption" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Glyph name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info';
interface ToastMsg {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastContext = createContext<{ show: (text: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({ id: Date.now(), kind, text });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null));
      }, 3200);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg ? <ToastView msg={msg} opacity={opacity} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ msg, opacity }: { msg: ToastMsg; opacity: Animated.Value }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const icon = msg.kind === 'success' ? 'check-circle' : msg.kind === 'error' ? 'warning' : 'info';
  const tint = msg.kind === 'success' ? colors.success : msg.kind === 'error' ? colors.danger : colors.brand;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        alignItems: 'center',
        opacity,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          maxWidth: 520,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.pop,
          shadowOpacity: 0.12,
        }}
      >
        <Glyph name={icon} size={18} color={tint} />
        <Text size={14} weight="medium" color={colors.text} style={{ flexShrink: 1 }}>
          {msg.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {} };
}

/**
 * A sheet that asks for a short text (a reason, a note) and confirms.
 */
export function PromptSheet({
  visible,
  onClose,
  title,
  description,
  label = 'Reason',
  placeholder,
  confirmLabel = 'Confirm',
  destructive,
  required = true,
  minLength = 0,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  destructive?: boolean;
  required?: boolean;
  minLength?: number;
  onConfirm: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => {
    setText('');
    onClose();
  };
  const valid = !required || text.trim().length >= Math.max(1, minLength);
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={title}
      subtitle={description}
      footer={
        <Button
          label={confirmLabel}
          variant={destructive ? 'destructive' : 'ink'}
          full
          disabled={!valid}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onConfirm(text.trim());
              setText('');
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <Input label={label} value={text} onChangeText={setText} placeholder={placeholder} multiline hint={minLength ? `At least ${minLength} characters.` : undefined} />
    </Sheet>
  );
}

/** A labelled field that opens a sheet of options. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  error,
}: {
  label?: string;
  value: T | '' | null | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={{
          height: 46,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text size={15} color={current ? colors.text : colors.placeholder} numberOfLines={1} style={{ flex: 1 }}>
          {current?.label ?? placeholder}
        </Text>
        <Glyph name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }}>
          {options.map((o, i) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  backgroundColor: active ? colors.brandSoft : pressed ? colors.muted : colors.surface,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                })}
              >
                <Text weight={active ? 'semibold' : 'regular'} color={colors.text}>
                  {o.label}
                </Text>
                {active ? <Glyph name="check" size={18} color={colors.brand} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
