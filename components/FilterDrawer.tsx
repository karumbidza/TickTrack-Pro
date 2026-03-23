'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface FilterState {
  status: string[]
  priority: string[]
  type: string[]
  date: string
  dateFrom: string
  dateTo: string
  branch: string[]
}

export const EMPTY_FILTERS: FilterState = {
  status: [],
  priority: [],
  type: [],
  date: '',
  dateFrom: '',
  dateTo: '',
  branch: [],
}

interface Branch {
  id: string
  name: string
}

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  filters: FilterState
  sections?: Array<'status' | 'priority' | 'type' | 'date' | 'branch'>
  statusOptions?: Array<{ value: string; label: string }>
  branches?: Branch[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  // Ticket statuses
  OPEN:                { bg: '#e8f5ee', color: '#2d6a4f' },
  ASSIGNED:            { bg: '#fef3c7', color: '#92400e' },
  IN_PROGRESS:         { bg: '#fef3c7', color: '#92400e' },
  AWAITING_APPROVAL:   { bg: '#fef3c7', color: '#92400e' },
  AWAITING_QUOTE:      { bg: '#fef3c7', color: '#92400e' },
  AWAITING_DESCRIPTION:{ bg: '#fef3c7', color: '#92400e' },
  AWAITING_WORK_APPROVAL:{ bg: '#fef3c7', color: '#92400e' },
  ON_SITE:             { bg: '#eff6ff', color: '#1e40af' },
  COMPLETED:           { bg: '#eff6ff', color: '#1e40af' },
  CLOSED:              { bg: '#f0efe9', color: '#6b6860' },
  CANCELLED:           { bg: '#f0efe9', color: '#6b6860' },
  NEW:                 { bg: '#e8f5ee', color: '#2d6a4f' },
  // Asset statuses
  ACTIVE:              { bg: '#e8f5ee', color: '#2d6a4f' },
  MAINTENANCE:         { bg: '#fef3c7', color: '#92400e' },
  REPAIR_NEEDED:       { bg: '#fef3c7', color: '#92400e' },
  OUT_OF_SERVICE:      { bg: '#fef2f2', color: '#991b1b' },
  RETIRED:             { bg: '#f0efe9', color: '#6b6860' },
  DECOMMISSIONED:      { bg: '#f0efe9', color: '#6b6860' },
  TRANSFERRED:         { bg: '#eff6ff', color: '#1e40af' },
}

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: '#fef2f2', color: '#991b1b' },
  HIGH:     { bg: '#fef2f2', color: '#991b1b' },
  MEDIUM:   { bg: '#fef3c7', color: '#92400e' },
  LOW:      { bg: '#f0efe9', color: '#6b6860' },
}

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom',label: 'Custom' },
]

const DEFAULT_STATUS_OPTIONS = [
  { value: 'OPEN',               label: 'Open' },
  { value: 'ASSIGNED',           label: 'Assigned' },
  { value: 'IN_PROGRESS',        label: 'In Progress' },
  { value: 'ON_SITE',            label: 'On Site' },
  { value: 'AWAITING_APPROVAL',  label: 'Awaiting Approval' },
  { value: 'COMPLETED',          label: 'Completed' },
  { value: 'CLOSED',             label: 'Closed' },
  { value: 'CANCELLED',          label: 'Cancelled' },
]

const TYPE_OPTIONS = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'IT',          label: 'IT' },
  { value: 'SALES',       label: 'Sales' },
  { value: 'RETAIL',      label: 'Retail' },
  { value: 'PROJECTS',    label: 'Projects' },
  { value: 'GENERAL',     label: 'General' },
]

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH',     label: 'High' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'LOW',      label: 'Low' },
]

// ─── CheckRow ─────────────────────────────────────────────────────────────────
function CheckRow({
  label, checked, onChange, color,
}: {
  label: string
  checked: boolean
  onChange: () => void
  color?: { bg: string; color: string }
}) {
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 0', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: checked ? '1.5px solid #1a1916' : '1.5px solid var(--border)',
          backgroundColor: checked ? '#1a1916' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="#f7f6f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        {color ? (
          <span style={{
            fontSize: 11, padding: '1px 7px', borderRadius: 99,
            backgroundColor: color.bg, color: color.color, fontWeight: checked ? 500 : 400,
          }}>
            {label}
          </span>
        ) : (
          <span style={{
            fontSize: 12,
            color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: checked ? 500 : 400,
          }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        {label}
      </p>
      {children}
      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />
    </div>
  )
}

// ─── FilterDrawer ─────────────────────────────────────────────────────────────
export function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  filters,
  sections = ['status', 'priority', 'type', 'date'],
  statusOptions = DEFAULT_STATUS_OPTIONS,
  branches = [],
}: FilterDrawerProps) {
  const [draft, setDraft] = useState<FilterState>(filters)

  // Sync draft with incoming filters whenever drawer opens
  useEffect(() => {
    if (isOpen) setDraft(filters)
  }, [isOpen, filters])

  // ESC key closes drawer
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const toggle = useCallback((field: 'status' | 'priority' | 'type' | 'branch', value: string) => {
    setDraft(d => ({
      ...d,
      [field]: d[field].includes(value)
        ? d[field].filter(v => v !== value)
        : [...d[field], value],
    }))
  }, [])

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleClear = () => {
    setDraft(EMPTY_FILTERS)
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(26,25,22,0.3)',
            zIndex: 49,
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 280,
        backgroundColor: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Filters
          </span>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24,
              border: '1px solid var(--border)',
              borderRadius: 6,
              backgroundColor: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={12} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {/* Status */}
          {sections.includes('status') && (
            <Section label="Status">
              {statusOptions.map(({ value, label }) => (
                <CheckRow
                  key={value}
                  label={label}
                  checked={draft.status.includes(value)}
                  onChange={() => toggle('status', value)}
                  color={STATUS_COLORS[value]}
                />
              ))}
            </Section>
          )}

          {/* Priority */}
          {sections.includes('priority') && (
            <Section label="Priority">
              {PRIORITY_OPTIONS.map(({ value, label }) => (
                <CheckRow
                  key={value}
                  label={label}
                  checked={draft.priority.includes(value)}
                  onChange={() => toggle('priority', value)}
                  color={PRIORITY_COLORS[value]}
                />
              ))}
            </Section>
          )}

          {/* Type */}
          {sections.includes('type') && (
            <Section label="Type">
              {TYPE_OPTIONS.map(({ value, label }) => (
                <CheckRow
                  key={value}
                  label={label}
                  checked={draft.type.includes(value)}
                  onChange={() => toggle('type', value)}
                />
              ))}
            </Section>
          )}

          {/* Date */}
          {sections.includes('date') && (
            <Section label="Date Created">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {DATE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDraft(d => ({ ...d, date: d.date === value ? '' : value }))}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 99,
                      border: `1px solid ${draft.date === value ? '#1a1916' : 'var(--border)'}`,
                      backgroundColor: draft.date === value ? '#1a1916' : 'transparent',
                      color: draft.date === value ? '#f7f6f3' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.date === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</label>
                    <input
                      type="date"
                      value={draft.dateFrom}
                      onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                      style={{
                        display: 'block', width: '100%', marginTop: 4,
                        padding: '5px 8px', fontSize: 12,
                        border: '1px solid var(--border)', borderRadius: 6,
                        backgroundColor: 'var(--surface2)', color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</label>
                    <input
                      type="date"
                      value={draft.dateTo}
                      onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                      style={{
                        display: 'block', width: '100%', marginTop: 4,
                        padding: '5px 8px', fontSize: 12,
                        border: '1px solid var(--border)', borderRadius: 6,
                        backgroundColor: 'var(--surface2)', color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Branch */}
          {sections.includes('branch') && branches.length > 0 && (
            <Section label="Branch">
              {branches.map(b => (
                <CheckRow
                  key={b.id}
                  label={b.name}
                  checked={draft.branch.includes(b.id)}
                  onChange={() => toggle('branch', b.id)}
                />
              ))}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8,
          flexShrink: 0,
        }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1, padding: '8px 0', fontSize: 12,
              border: '1px solid var(--border)', borderRadius: 8,
              backgroundColor: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 2, padding: '8px 0', fontSize: 12,
              border: '1px solid #1a1916', borderRadius: 8,
              backgroundColor: '#1a1916', color: '#f7f6f3',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}

// ─── FilterButton ─────────────────────────────────────────────────────────────
export function FilterButton({
  isOpen,
  activeCount,
  onClick,
}: {
  isOpen: boolean
  activeCount: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', fontSize: 12, borderRadius: 8,
        border: `1px solid ${isOpen ? 'var(--border-strong, #c8c6bc)' : 'var(--border)'}`,
        backgroundColor: isOpen ? 'var(--surface2)' : 'transparent',
        color: 'var(--text-secondary)', cursor: 'pointer',
      }}
    >
      <SlidersHorizontal size={13} strokeWidth={1.5} />
      Filters
      {activeCount > 0 && (
        <span style={{
          width: 16, height: 16, borderRadius: '50%',
          backgroundColor: '#1a1916', color: '#f7f6f3',
          fontFamily: 'DM Mono, monospace', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 500, flexShrink: 0,
        }}>
          {activeCount}
        </span>
      )}
    </button>
  )
}

// ─── ActiveFilterTags ─────────────────────────────────────────────────────────
export function ActiveFilterTags({
  filters,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  branches = [],
  onRemove,
  onClearAll,
}: {
  filters: FilterState
  statusOptions?: Array<{ value: string; label: string }>
  branches?: Branch[]
  onRemove: (field: keyof FilterState, value: string) => void
  onClearAll: () => void
}) {
  const tags: Array<{ field: keyof FilterState; value: string; label: string }> = []

  filters.status.forEach(v => {
    const opt = statusOptions.find(o => o.value === v)
    tags.push({ field: 'status', value: v, label: opt?.label ?? v })
  })
  filters.priority.forEach(v => {
    const opt = PRIORITY_OPTIONS.find(o => o.value === v)
    tags.push({ field: 'priority', value: v, label: opt?.label ?? v })
  })
  filters.type.forEach(v => {
    const opt = TYPE_OPTIONS.find(o => o.value === v)
    tags.push({ field: 'type', value: v, label: opt?.label ?? v })
  })
  filters.branch.forEach(v => {
    const b = branches.find(br => br.id === v)
    tags.push({ field: 'branch', value: v, label: b?.name ?? v })
  })
  if (filters.date) {
    const opt = DATE_OPTIONS.find(o => o.value === filters.date)
    tags.push({ field: 'date', value: filters.date, label: opt?.label ?? filters.date })
  }

  if (tags.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      padding: '7px 18px',
      backgroundColor: 'var(--surface2)',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontFamily: 'DM Mono, monospace', fontSize: 9,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginRight: 2,
      }}>
        Filtered:
      </span>
      {tags.map(({ field, value, label }) => (
        <span
          key={`${field}-${value}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            border: '1px solid var(--border)', borderRadius: 99,
            padding: '2px 8px', fontSize: 11,
            color: 'var(--text-secondary)', backgroundColor: 'var(--surface)',
          }}
        >
          {label}
          <button
            onClick={() => onRemove(field, value)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          fontSize: 11, color: 'var(--text-muted)',
          background: 'none', border: 'none', cursor: 'pointer',
          marginLeft: 2, textDecoration: 'underline',
        }}
      >
        Clear all
      </button>
    </div>
  )
}

// ─── useFilterCount ────────────────────────────────────────────────────────────
export function countActiveFilters(filters: FilterState): number {
  return (
    filters.status.length +
    filters.priority.length +
    filters.type.length +
    filters.branch.length +
    (filters.date ? 1 : 0)
  )
}
