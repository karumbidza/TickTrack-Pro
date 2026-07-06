/**
 * Design tokens mirrored from the web redesign (warm paper + violet accent).
 * Kept in sync with app/globals.css on the web side.
 */
export const colors = {
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  sidebarSurface: '#FCFBF9',
  border: '#E8E5DE',
  borderInner: '#EEEBE4',
  rowSep: '#F1EFE9',
  hover: '#FAF9F6',
  textPrimary: '#1A1916',
  textSecondary: '#6B6860',
  textTertiary: '#4A4843',
  textMuted: '#9E9C94',
  textFaint: '#B3B0A7',
  accent: '#5A51D6',
  accentSoft: '#EEEDFB',
  white: '#FFFFFF',
  // status
  green: '#2D6A4F', greenBg: '#E8F5EE',
  amber: '#92400E', amberBg: '#FEF3C7',
  blue: '#1E40AF', blueBg: '#DBEAFE',
  red: '#991B1B', redBg: '#FEE2E2',
  orange: '#9A3412', orangeBg: '#FFEDD5',
  violet: '#5B21B6', violetBg: '#EDE9FE',
  neutral: '#4A4843', neutralBg: '#ECEAE3',
}

export const radius = { card: 14, control: 9, pill: 99 }

export const font = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansLight: 'DMSans_300Light',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
}

export type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'orange' | 'violet' | 'neutral' | 'accent'

export const badgeColors: Record<BadgeVariant, { bg: string; fg: string }> = {
  green: { bg: colors.greenBg, fg: colors.green },
  amber: { bg: colors.amberBg, fg: colors.amber },
  blue: { bg: colors.blueBg, fg: colors.blue },
  red: { bg: colors.redBg, fg: colors.red },
  orange: { bg: colors.orangeBg, fg: colors.orange },
  violet: { bg: colors.violetBg, fg: colors.violet },
  neutral: { bg: colors.neutralBg, fg: colors.neutral },
  accent: { bg: colors.accentSoft, fg: colors.accent },
}

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OPEN: 'amber', ASSIGNED: 'blue', ACCEPTED: 'blue', IN_PROGRESS: 'blue', PROCESSING: 'blue',
  ON_SITE: 'violet', AWAITING_QUOTE: 'amber', QUOTE_SUBMITTED: 'amber',
  AWAITING_DESCRIPTION: 'amber', AWAITING_WORK_APPROVAL: 'amber',
  COMPLETED: 'green', CLOSED: 'neutral', CANCELLED: 'red',
}
export const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  LOW: 'green', MEDIUM: 'amber', HIGH: 'orange', CRITICAL: 'red', URGENT: 'red',
}

export const statusLabel = (s: string) => (s || '').replace(/_/g, ' ')
