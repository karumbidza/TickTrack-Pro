import { describe, it, expect } from 'vitest'
import { generateToken, hashToken } from '@/lib/tokens'

describe('opaque bearer tokens', () => {
  it('hashToken is deterministic (same input -> same hash)', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
  })

  it('hashToken produces a 64-char hex SHA-256 digest, not the input', () => {
    const h = hashToken('secret-token')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).not.toBe('secret-token')
  })

  it('different tokens hash differently', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })

  it('generateToken returns unique high-entropy hex tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })
})
