'use client'

import React from 'react'

/**
 * Tenant Admin redesign — shared UI primitives.
 * Flat, airy, bordered surfaces over the warm-neutral DM Sans system with a
 * single violet accent. Styling lives in app/globals.css (tokens + utilities).
 */

export type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'orange' | 'violet' | 'neutral' | 'accent'

/** Flat white card. */
export function Card({
  children,
  className = '',
  style,
  padding = '18px 20px',
  onClick,
  hover,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  padding?: string | number
  onClick?: () => void
  hover?: boolean
}) {
  return (
    <div
      className={`ds-card ${className}`}
      onClick={onClick}
      style={{ padding, cursor: onClick ? 'pointer' : undefined, ...style }}
    >
      {children}
    </div>
  )
}

/** DM-Mono uppercase label used for section/column headers, IDs, timestamps. */
export function MonoLabel({
  children,
  size = 10.5,
  color = 'var(--text-muted)',
  spacing = '0.1em',
  style,
}: {
  children: React.ReactNode
  size?: number
  color?: string
  spacing?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: size,
        letterSpacing: spacing,
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** Card title (14.5px / 500). */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14.5, fontWeight: 500 }}>{children}</div>
}

/** Mono pill badge (status / role / priority). */
export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span
      className={`badge-${variant}`}
      style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** Tinted initials avatar. Circle in lists, rounded-square when `square`. */
export function Avatar({
  initials,
  size = 32,
  tint = 'var(--accent-soft)',
  color = 'var(--accent-color)',
  square = false,
}: {
  initials: string
  size?: number
  tint?: string
  color?: string
  square?: boolean
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: square ? 9 : 99,
        background: tint,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Mono, monospace',
        fontSize: Math.round(size * 0.36),
        flex: 'none',
      }}
    >
      {initials}
    </div>
  )
}

/** Dashboard stat card: mono label, big number, delta, tinted icon chip. */
export function StatCard({
  label,
  value,
  delta,
  deltaColor = 'var(--text-muted)',
  note,
  icon,
  tint,
  iconColor,
}: {
  label: string
  value: React.ReactNode
  delta?: string
  deltaColor?: string
  note?: string
  icon?: React.ReactNode
  tint?: string
  iconColor?: string
}) {
  return (
    <Card padding="18px 20px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <MonoLabel>{label}</MonoLabel>
        {icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: tint,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="stat-number" style={{ marginTop: 8 }}>{value}</div>
      {(delta || note) && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {delta && <span style={{ color: deltaColor, fontWeight: 500 }}>{delta}</span>} {note}
        </div>
      )}
    </Card>
  )
}

/** iOS-style toggle. */
export function Toggle({ on, onChange }: { on: boolean; onChange?: (next: boolean) => void }) {
  return (
    <div className={`ds-toggle${on ? ' on' : ''}`} onClick={() => onChange?.(!on)}>
      <div className="knob" />
    </div>
  )
}

export function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

/** Deterministic tint pair for an avatar, cycling the design's status palette. */
const TINT_CYCLE: Array<{ tint: string; color: string }> = [
  { tint: 'var(--accent-soft)', color: 'var(--accent-color)' },
  { tint: 'var(--green-bg)', color: 'var(--green)' },
  { tint: 'var(--blue-bg)', color: 'var(--blue)' },
  { tint: 'var(--amber-bg)', color: 'var(--amber)' },
  { tint: 'var(--violet-bg)', color: 'var(--violet)' },
]
export function avatarTint(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TINT_CYCLE[h % TINT_CYCLE.length]
}
