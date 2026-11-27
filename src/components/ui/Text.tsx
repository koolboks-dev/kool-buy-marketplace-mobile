import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { font, useTheme } from '@/theme';

/**
 * Typography roles from DESIGN.md §3:
 * title 24–28/700 · heading 18/600 · subtitle 16/600 · body 14 ash-700 ·
 * secondary 14 ash-600 · caption 12 ash-500 · price 600–700 charcoal, tabular.
 */
export type TextVariant = 'display' | 'title' | 'heading' | 'subtitle' | 'body' | 'secondary' | 'caption' | 'label' | 'price' | 'link' | 'overline';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: TextStyle['textAlign'];
  size?: number;
}

export function Text({ variant = 'body', color, weight, align, size, style, ...rest }: Props) {
  const { colors } = useTheme();
  const base: Record<TextVariant, TextStyle> = {
    display: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.4 },
    title: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: colors.text, letterSpacing: -0.2 },
    heading: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: colors.text },
    subtitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
    body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.body },
    secondary: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
    label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.body },
    price: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.text, fontVariant: ['tabular-nums'] },
    link: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.brandText },
    overline: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  };
  const weightStyle = weight ? { fontFamily: font[weight] } : null;
  return (
    <RNText
      {...rest}
      style={[
        base[variant],
        weightStyle,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        size ? { fontSize: size, lineHeight: Math.round(size * 1.35) } : null,
        style,
      ]}
    />
  );
}
