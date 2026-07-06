import { describe, it, expect } from 'vitest'
import { verifyFileSignature } from '@/lib/r2-storage'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
const webp = Buffer.concat([Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]), Buffer.from('WEBP')])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
const html = Buffer.from('<!doctype html><script>alert(1)</script>')

describe('verifyFileSignature', () => {
  it('accepts real PNG/JPEG/PDF/WEBP matching their declared type', () => {
    expect(verifyFileSignature(png, 'image/png')).toBe(true)
    expect(verifyFileSignature(jpeg, 'image/jpeg')).toBe(true)
    expect(verifyFileSignature(pdf, 'application/pdf')).toBe(true)
    expect(verifyFileSignature(webp, 'image/webp')).toBe(true)
  })

  it('rejects a PNG masquerading as a JPEG (bytes vs declared type mismatch)', () => {
    expect(verifyFileSignature(png, 'image/jpeg')).toBe(false)
  })

  it('rejects SVG and HTML (no signature -> active content cannot be stored as an image)', () => {
    expect(verifyFileSignature(svg, 'image/svg+xml')).toBe(false)
    expect(verifyFileSignature(svg, 'image/png')).toBe(false)
    expect(verifyFileSignature(html, 'text/html')).toBe(false)
    expect(verifyFileSignature(html, 'image/png')).toBe(false)
  })

  it('rejects a RIFF container that is not actually WEBP', () => {
    const riffAvi = Buffer.concat([Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]), Buffer.from('AVI ')])
    expect(verifyFileSignature(riffAvi, 'image/webp')).toBe(false)
  })
})
