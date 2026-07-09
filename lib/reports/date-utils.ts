import { subDays, startOfYear } from 'date-fns'

export function getDateRange(
  range: string,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  const now = new Date()

  switch (range) {
    case '30d':
      return { from: subDays(now, 30), to: now }
    case '90d':
      return { from: subDays(now, 90), to: now }
    case 'year':
      return { from: startOfYear(now), to: now }
    case 'custom':
      return {
        from: new Date(customFrom!),
        to: new Date(customTo!),
      }
    default:
      return { from: subDays(now, 30), to: now }
  }
}
