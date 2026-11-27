/**
 * KoolBuy Marketplace design tokens — mirrors kool-buy-marketplace/styles/tokens.css
 * and DESIGN.md (the Koolboks Sales CRM look): white cards on a soft grey page,
 * 1px light borders, charcoal text, 12px corners, Koolboks orange as the only accent.
 *
 * Dark mode uses the CRM's slate values (#0F172A page, #1E293B cards, #334155 borders).
 */

export const palette = {
  primary50: '#FEF1E6',
  primary100: '#FDE3CC',
  primary200: '#FBC79A',
  primary300: '#F9AB67',
  primary400: '#F79540',
  primary500: '#F57E16',
  primary600: '#DC6C0B',
  primary700: '#B85A0A',

  ash50: '#F8F9FA',
  ash100: '#F1F3F5',
  ash200: '#E9ECEF',
  ash300: '#DEE2E6',
  ash400: '#ADB5BD',
  ash500: '#6C757D',
  ash600: '#495057',
  ash700: '#343A40',
  ash800: '#212529',
  ash900: '#16181B',
  ash950: '#050711',

  leaf50: '#F0F4F2',
  leaf100: '#DCE6E1',
  leaf500: '#6C8B7D',
  leaf600: '#5A7669',
  leaf700: '#4A6357',

  verified50: '#ECFDF3',
  verified200: '#A6F4C5',
  verified500: '#12B76A',
  verified700: '#027A48',

  amber50: '#FFF6E4',
  amber100: '#FFE9BE',
  amber400: '#FFB020',
  amber500: '#F5A524',
  amber800: '#7C4A08',

  ember50: '#FCEBED',
  ember100: '#F8D7DA',
  ember500: '#DC3545',
  ember600: '#C82333',
  ember700: '#A71D2A',

  white: '#FFFFFF',
} as const;

export interface ThemeColors {
  /** Page background (ash-50). */
  background: string;
  /** Cards, panels, bars (white). */
  surface: string;
  /** Muted wells, table headers, hover (ash-50 / ash-100). */
  muted: string;
  mutedStrong: string;
  /** The one border colour (ash-200). */
  border: string;
  borderStrong: string;
  /** Headings, values, prices (ash-950). */
  text: string;
  /** Body (ash-700). */
  body: string;
  /** Secondary text (ash-600). */
  textSecondary: string;
  /** Captions, hints (ash-500). */
  textMuted: string;
  placeholder: string;
  /** Orange fill for the one key CTA. */
  brand: string;
  brandPressed: string;
  brandSoft: string;
  /** Orange text (primary-700 — AA on white). */
  brandText: string;
  /** Charcoal button (DESIGN "cocoa" variant). */
  ink: string;
  onInk: string;
  success: string;
  successSoft: string;
  successText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  verified: string;
  verifiedSoft: string;
  verifiedText: string;
  star: string;
  overlay: string;
  /** Active nav item (charcoal pill). */
  navActive: string;
  onNavActive: string;
}

export const lightColors: ThemeColors = {
  background: palette.ash50,
  surface: palette.white,
  muted: palette.ash50,
  mutedStrong: palette.ash100,
  border: palette.ash200,
  borderStrong: palette.ash300,
  text: palette.ash950,
  body: palette.ash700,
  textSecondary: palette.ash600,
  textMuted: palette.ash500,
  placeholder: palette.ash400,
  brand: palette.primary500,
  brandPressed: palette.primary600,
  brandSoft: palette.primary50,
  brandText: palette.primary700,
  ink: palette.ash950,
  onInk: palette.white,
  success: palette.leaf500,
  successSoft: palette.leaf50,
  successText: palette.leaf700,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  warningText: palette.amber800,
  danger: palette.ember500,
  dangerSoft: palette.ember50,
  dangerText: palette.ember700,
  verified: palette.verified500,
  verifiedSoft: palette.verified50,
  verifiedText: palette.verified700,
  star: palette.amber400,
  overlay: 'rgba(5,7,17,0.45)',
  navActive: palette.ash950,
  onNavActive: palette.white,
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  muted: '#172033',
  mutedStrong: '#26344A',
  border: '#334155',
  borderStrong: '#475569',
  text: '#F8FAFC',
  body: '#E2E8F0',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  placeholder: '#64748B',
  brand: palette.primary500,
  brandPressed: palette.primary600,
  brandSoft: 'rgba(245,126,22,0.16)',
  brandText: palette.primary400,
  ink: '#F8FAFC',
  onInk: '#0F172A',
  success: '#86A897',
  successSoft: 'rgba(108,139,125,0.18)',
  successText: '#A7C4B5',
  warning: palette.amber500,
  warningSoft: 'rgba(245,165,36,0.16)',
  warningText: '#FCD38A',
  danger: '#F26B78',
  dangerSoft: 'rgba(220,53,69,0.18)',
  dangerText: '#F8A5AE',
  verified: '#32D583',
  verifiedSoft: 'rgba(18,183,106,0.16)',
  verifiedText: '#6CE9A6',
  star: palette.amber400,
  overlay: 'rgba(0,0,0,0.6)',
  navActive: palette.primary500,
  onNavActive: palette.white,
};

/** Spacing scale: 4, 8, 12, 16, 24, 32, 40. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;

/** Radius scale (Sales CRM): sm 8, md 10, lg 12 (cards, inputs, buttons), xl 16, 2xl 20. */
export const radius = { sm: 8, md: 10, lg: 12, xl: 16, xxl: 20, full: 999 } as const;

export const font = {
  regular: 'WorkSans_400Regular',
  medium: 'WorkSans_500Medium',
  semibold: 'WorkSans_600SemiBold',
  bold: 'WorkSans_700Bold',
} as const;

/** Category chart palette (DESIGN: charts are the one place this is allowed). */
export const SERIES = ['#3B82F6', '#F57E16', '#6C8B7D', '#F5A524', '#64748B', '#14B8A6', '#8B5CF6', '#DC3545'];

/** Soft elevation for modals only (no resting shadows on cards). */
export const shadow = {
  sheet: {
    shadowColor: '#050711',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  pop: {
    shadowColor: '#050711',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;
