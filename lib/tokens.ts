import { randomBytes, createHash } from 'crypto'

/**
 * OPAQUE BEARER TOKENS
 * ====================
 * Link tokens (account activation, invitations, contractor registration, KYC
 * password setup) are sent to the user in a URL, but must be stored HASHED so a
 * database read cannot be replayed to take over an account.
 *
 * Usage:
 *   const raw = generateToken()          // put `raw` in the emailed link
 *   store hashToken(raw)                 // persist only the hash
 *   // on redemption, look up by hashToken(presentedToken)
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
