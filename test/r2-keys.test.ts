import { describe, it, expect } from 'vitest'
import { fileAccessUrl, getKeyFromUrl, isValidObjectKey, keyTenantId } from '@/lib/r2-storage'

describe('object-key helpers', () => {
  it('fileAccessUrl builds the in-app access path', () => {
    expect(fileAccessUrl('t/abc/invoices/1-x.pdf')).toBe('/api/files/t/abc/invoices/1-x.pdf')
  })

  it('getKeyFromUrl resolves app paths and bare keys', () => {
    expect(getKeyFromUrl('/api/files/t/abc/assets/1-x.png')).toBe('t/abc/assets/1-x.png')
    expect(getKeyFromUrl('t/abc/assets/1-x.png')).toBe('t/abc/assets/1-x.png')
    expect(getKeyFromUrl('https://evil.example/x')).toBeNull()
  })

  it('keyTenantId extracts the tenant only from a t/ prefix', () => {
    expect(keyTenantId('t/tenant-123/invoices/1-x.pdf')).toBe('tenant-123')
    expect(keyTenantId('public/assets/1-x.png')).toBeNull()
    expect(keyTenantId('assets/1-x.png')).toBeNull() // legacy key -> untenanted
  })

  it('isValidObjectKey accepts tenant/public/legacy keys and rejects traversal', () => {
    expect(isValidObjectKey('t/abc/invoices/1-x.pdf')).toBe(true)
    expect(isValidObjectKey('public/assets/1-x.png')).toBe(true)
    expect(isValidObjectKey('assets/1-x.png')).toBe(true)
    expect(isValidObjectKey('t/abc/../secret')).toBe(false)
    expect(isValidObjectKey('t/abc//x')).toBe(false)
    expect(isValidObjectKey('singleSegment')).toBe(false)
    expect(isValidObjectKey('')).toBe(false)
  })
})
