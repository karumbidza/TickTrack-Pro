# Money: Float → Decimal migration plan

**Status:** planned, not yet executed. **Risk:** High (touches money + API contract + frontend). **Requires:** DB backup, staging validation, backend+frontend in lockstep.

## Why

All monetary values are Prisma `Float` (IEEE-754 double). This causes cent-drift on accumulation and makes threshold checks like `balance <= 0` misfire (e.g. a residual `0.0000000001` balance leaves an invoice not-fully-paid, or rounding marks it paid early). For a payments product this is a correctness defect, not a nicety.

## Why this was NOT done as a blind edit

Changing a field from `Float` to `Decimal` in `schema.prisma` changes the **generated TypeScript type** from `number` to `Prisma.Decimal`. Two things break at once:

1. **API contract.** `Prisma.Decimal` serializes to a JSON **string**, not a number. Every API response that returns a money field would silently change shape (`"amount": 1500` → `"amount": "1500"`), breaking ~71 frontend formatting sites (`toLocaleString`, `toFixed`) and ~21 backend arithmetic sites.
2. **Arithmetic.** `invoice.amount + x`, `reduce((s, i) => s + i.amount, 0)`, and `balance <= 0` no longer compile/behave correctly against `Decimal` — they require `.plus()`, `.minus()`, `.lte()`.

Doing this blind, with no running app and no frontend coordination, would corrupt money math and the API. It must be staged.

## Affected fields (22)

| Model | Field(s) |
|---|---|
| Subscription | `amount` |
| Payment | `amount` |
| Quote | `estimatedCost` |
| Ticket | `estimatedHours`, `actualHours`, `quoteAmount` |
| QuoteRequest | `quoteAmount` |
| Contractor | `hourlyRate` (`rating` is a score, leave as Float) |
| Asset | `purchasePrice`, `currentValue` |
| MaintenanceHistory | `cost` |
| AssetHistory | `cost` |
| ContractorSubscription | `invoiceFee` |
| ContractorPayment | `amount` |
| PaymentBatch | `totalAmount` |
| Invoice | `amount`, `hoursWorked`, `hourlyRate`, `quotedAmount`, `paidAmount`, `balance` |

`Contractor.rating` and `Ticket.estimatedHours/actualHours` are quantities, not money — decide per-field whether they need Decimal (rating: no; hours: probably Float is fine).

## Two options

### Option A — Prisma `Decimal @db.Decimal(12, 2)` (recommended)
- Postgres `NUMERIC(12,2)`, exact to the cent, human-readable in the DB.
- Cost: must introduce a **serialization boundary** so the API keeps returning numbers. Add a `money(d: Prisma.Decimal | null): number` helper and map it in every response, OR standardize responses through a serializer that converts Decimals to numbers (safe up to 2^53 cents ≈ $90 trillion — fine here).
- Arithmetic moves to `.plus()/.minus()/.lte()` or is done via Prisma `increment`/`decrement` (already used in the atomic payment write).

### Option B — integer minor units (cents) as `Int`/`BigInt`
- Store `amountCents`. Exact, trivially fast, JSON-number-safe.
- Cost: a wider rename (every field + every read/write divides/multiplies by 100), and a data backfill. Larger diff than A.

**Recommendation: Option A.** Smaller surface, keeps column semantics, and the serialization helper is the only new concept.

## Staged execution (reversible)

1. **Backup** the production database. Non-negotiable.
2. **Schema + migration.** Change the 22 fields to `Decimal @db.Decimal(12,2)`. Prisma generates an `ALTER COLUMN ... TYPE NUMERIC(12,2) USING (...::numeric)`; verify the generated SQL casts existing values (no data loss for values already within scale).
3. **Serialization boundary first.** Add `lib/money.ts` with `toNumber(d)` / `toDecimal(n)` and a response mapper. Land this and route money responses through it so the API still emits JSON numbers. This is the change that protects the frontend.
4. **Fix arithmetic sites** (~21 in `app/`): replace `+/-/<=` on money with Decimal methods or Prisma `increment`/`decrement`. The atomic invoice-payment write already uses increment/decrement and needs no change.
5. **Frontend:** no change required if step 3 keeps responses as numbers. Verify the ~71 formatting sites still receive numbers (add a couple of contract tests).
6. **Test:** unit tests for the money helper (rounding, null handling); an integration test that a full/partial invoice payment leaves `balance` exact to the cent; a contract test asserting money fields in key API responses are JSON numbers.
7. **Deploy** with `prisma migrate deploy`, monitor, and keep the backup until verified.

## Rollback
If step 2's migration misbehaves, restore from the step-1 backup. Because the serialization boundary (step 3) keeps the API shape stable, application rollback is independent of the DB column type and can be deployed separately.
