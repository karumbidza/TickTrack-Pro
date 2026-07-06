#!/usr/bin/env node
/**
 * Backfill stored public R2 URLs -> in-app access paths (/api/files/<key>).
 * Run AFTER deploying the private-bucket code and taking a DB backup, then flip
 * the bucket to private. See docs/PRIVATE_BUCKET_MIGRATION.md.
 *
 *   FILE_URL_BACKFILL=yes node scripts/backfill-file-urls.js            # dry run
 *   FILE_URL_BACKFILL=yes node scripts/backfill-file-urls.js --execute  # apply
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const EXECUTE = process.argv.includes('--execute')

function toAccessUrl(url) {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('/api/files/')) return null // already migrated
  const pub = process.env.R2_PUBLIC_URL
  if (pub && url.startsWith(pub + '/')) return '/api/files/' + url.slice(pub.length + 1)
  return null
}

// Scalar string columns that hold a single file URL: [prismaModel, field]
const SCALAR_FIELDS = [
  ['invoice', 'invoiceFileUrl'],
  ['invoice', 'proofOfPaymentUrl'],
  ['paymentBatch', 'popFileUrl'],
  ['ticket', 'quoteFileUrl'],
  ['quoteRequest', 'quoteFileUrl'],
  ['attachment', 'url'],
  ['contractorKYC', 'companyProfileUrl'],
  ['contractorKYC', 'certificateOfIncorporationUrl'],
  ['contractorKYC', 'cr5RegisteredOfficeUrl'],
  ['contractorKYC', 'cr6DirectorsListUrl'],
  ['contractorKYC', 'memorandumArticlesUrl'],
  ['contractorKYC', 'prazCertificateUrl'],
  ['contractorKYC', 'bankProofUrl'],
  ['contractorKYC', 'zimraTaxClearanceUrl'],
  ['contractorKYC', 'vatCertificateUrl'],
  ['contractorKYC', 'necComplianceUrl'],
  ['contractorKYC', 'insuranceCoverUrl'],
  ['contractorKYC', 'sheqPolicyUrl'],
  ['contractorKYC', 'publicLiabilityInsuranceUrl'],
  ['contractorKYC', 'safetyCertificatesUrl'],
  ['contractorKYC', 'methodStatementsUrl'],
  ['contractorKYC', 'referenceLettersUrl'],
  ['contractorKYC', 'previousWorkExamplesUrl'],
  ['contractorKYC', 'companyStampUrl'],
]

async function main() {
  if (process.env.FILE_URL_BACKFILL !== 'yes') {
    console.error('Refusing to run: set FILE_URL_BACKFILL=yes to proceed.')
    process.exit(1)
  }
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing)' : 'DRY RUN (no writes)'}`)
  console.log('Target DB:', (process.env.DATABASE_URL || '(unset)').replace(/:\/\/[^@]*@/, '://***@'))

  let total = 0

  for (const [model, field] of SCALAR_FIELDS) {
    const rows = await prisma[model].findMany({
      where: { [field]: { not: null } },
      select: { id: true, [field]: true },
    })
    let n = 0
    for (const row of rows) {
      const next = toAccessUrl(row[field])
      if (next) {
        n++
        if (EXECUTE) await prisma[model].update({ where: { id: row.id }, data: { [field]: next } })
      }
    }
    if (n) console.log(`  ${model}.${field}: ${n}`)
    total += n
  }

  // Asset.images is a JSON array of URLs.
  const assets = await prisma.asset.findMany({ select: { id: true, images: true } })
  let imgCount = 0
  for (const a of assets) {
    const imgs = Array.isArray(a.images) ? a.images : []
    let changed = false
    const migrated = imgs.map((u) => {
      const next = toAccessUrl(u)
      if (next) { changed = true; return next }
      return u
    })
    if (changed) {
      imgCount++
      if (EXECUTE) await prisma.asset.update({ where: { id: a.id }, data: { images: migrated } })
    }
  }
  if (imgCount) console.log(`  asset.images: ${imgCount} record(s)`)
  total += imgCount

  console.log(`${EXECUTE ? 'Updated' : 'Would update'} ${total} value(s).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
