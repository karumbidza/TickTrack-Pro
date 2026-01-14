# Paynow Payment Integration - Complete User Flow

## Overview
Paynow is a **hosted payment gateway** that handles all payment method selection and processing. Your app redirects users to Paynow's secure platform, and Paynow handles the rest.

---

## Complete User Journey

### **STEP 1: User on TickTrack Billing Page**

**URL:** `https://ticktrackpro.com/billing`

```
┌─────────────────────────────────────────────┐
│  Billing Page - Upgrade Your Plan Dialog    │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ Select Plan: [Basic] [Pro] [Enterprise] │
│  ✓ Billing Cycle: [Monthly] [Yearly]       │
│  ✓ Currency: [USD] [ZWL]                   │
│  ✓ Payment Method:                          │
│    ○ Paynow (Mobile Money) ← SELECTED      │
│    ○ Bank Transfer                          │
│                                             │
│        [Continue to Payment]  ← CLICK HERE  │
└─────────────────────────────────────────────┘
```

**User selections example:**
- Plan: Enterprise
- Cycle: Monthly
- Currency: USD
- Payment Method: **Paynow (Mobile Money)**

---

### **STEP 2: Click "Continue to Payment" Button**

**Component:** [app/billing/page.tsx](app/billing/page.tsx#L735-L750)

```typescript
<Button
  onClick={() => {
    if (selectedPaymentMethod === 'paynow') {
      handleUpgrade()  // ← This function is called
    }
  }}
>
  Continue to Payment
</Button>
```

**What happens in `handleUpgrade()`:**

```typescript
const handleUpgrade = async () => {
  setUpgradeLoading(true)
  
  // Make API call to backend
  const paymentResponse = await fetch('/api/billing/paynow/initiate', {
    method: 'POST',
    body: JSON.stringify({
      plan: 'ENTERPRISE',
      billingCycle: 'monthly',
      currency: 'USD'
    })
  })
  
  const paymentData = await paymentResponse.json()
  
  // CRITICAL: Redirect to Paynow's payment gateway
  if (paymentData.redirectUrl) {
    window.location.href = paymentData.redirectUrl  // ← USER LEAVES YOUR APP HERE
  }
}
```

---

### **STEP 3: Backend Creates Paynow Payment**

**Endpoint:** `POST /api/billing/paynow/initiate`

**File:** [app/api/billing/paynow/initiate/route.ts](app/api/billing/paynow/initiate/route.ts)

```typescript
// 1. Create payment object with Paynow SDK
const paynowPayment = paynow.createPayment(
  'SUB-abc123-1705256100',  // unique reference
  'user@example.com'
)

// 2. Add items to payment
paynowPayment.add('TickTrack Pro Enterprise - monthly', 199)

// 3. Send payment to Paynow (returns a redirectUrl)
const response = await paynow.send(paynowPayment)

// 4. Response contains:
{
  success: true,
  redirectUrl: 'https://www.paynow.co.zw/payment/xyz789',  // ← KEY!
  pollUrl: 'https://api.paynow.co.zw/api/v2/transactions/xyz789',
  hash: 'abcd1234...'
}

// 5. Return redirectUrl to frontend
return NextResponse.json({
  redirectUrl: 'https://www.paynow.co.zw/payment/xyz789'
})
```

---

### **STEP 4: Redirect to Paynow Payment Gateway**

**Paynow URL:** `https://www.paynow.co.zw/payment/xyz789`

Frontend executes:
```javascript
window.location.href = 'https://www.paynow.co.zw/payment/xyz789'
```

**User is now on Paynow's secure server, NOT your app anymore!**

```
YOUR APP                          PAYNOW GATEWAY
┌──────────────────┐              ┌─────────────────────────────────┐
│ Billing Page     │              │ Paynow Payment Page             │
│                  │              ├─────────────────────────────────┤
│ [Continue to     │  redirect    │ Order: TickTrack Pro Enterprise │
│  Payment] ──────────────────→   │ Amount: $199 USD                │
│                  │ (window.     │                                 │
│                  │  location    │ Select Payment Method:          │
│                  │  .href)      │ ┌─────────────────────────────┐ │
│                  │              │ │ ○ Visa Card                 │ │
│                  │              │ │ ○ Mastercard                │ │
│                  │              │ │ ○ ZIM-Switch                │ │
│                  │              │ │ ● EcoCash                   │ │
│                  │              │ │ ○ OneMoney                  │ │
│                  │              │ │ ○ Telecash                  │ │
│                  │              │ └─────────────────────────────┘ │
│                  │              │                                 │
│                  │              │ [Proceed with EcoCash]          │
│                  │              │ or [Select Different Method]    │
│                  │              └─────────────────────────────────┘
└──────────────────┘              └─────────────────────────────────┘
```

---

### **STEP 5: User Selects Payment Method on Paynow**

**User sees all available payment methods:**

```
Payment Method Selection (on Paynow's page)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 MOBILE MONEY (Most Popular)
   ○ EcoCash (Econet)
   ○ OneMoney (Vodafone)
   ○ Telecash (NetOne)
   ○ InnBucks

💳 CARD PAYMENTS
   ○ Visa
   ○ Mastercard

🏦 BANKING
   ○ ZIM-Switch (Bank Transfer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User clicks: "EcoCash" → Proceeds to EcoCash payment

Order Summary:
└─ TickTrack Pro Enterprise - Monthly
   └─ USD $199.00
   └─ Processing fee: USD $0.00
   └─ Total: USD $199.00
```

---

### **STEP 6: Payment Processing (EcoCash Example)**

**User selects EcoCash:**

```
Paynow redirects to EcoCash payment interface:

User enters:
- Phone Number: 263771234567 (Econet)
- PIN: ****

EcoCash processes the payment...
```

**Processing happens entirely on EcoCash/Paynow servers** - your app is not involved.

---

### **STEP 7: Payment Confirmation**

After payment succeeds/fails, Paynow sends data to your webhook:

**Webhook Endpoint:** `/api/payments/paynow/webhook`

Paynow POSTs to: `https://ticktrackpro.com/api/payments/paynow/webhook`

```json
{
  "id": "xyz789",
  "reference": "SUB-abc123-1705256100",
  "amount": 199,
  "status": "complete",
  "pollUrl": "https://api.paynow.co.zw/api/v2/transactions/xyz789"
}
```

Your webhook verifies the hash and activates the subscription.

---

### **STEP 8: Redirect Back to Your App**

After payment, Paynow redirects user to your `returnUrl`:

**Configured in `.env`:**
```
PAYNOW_RETURN_URL=https://ticktrackpro.com/billing/payment/return
```

```
Paynow Payment Complete
      ↓
Browser redirects to:
https://ticktrackpro.com/billing/payment/return?ref=xyz789
      ↓
Your return page shows:
"✓ Payment Successful!"
"Your subscription is now active."
```

---

## Key Points

| Aspect | Where It Happens | Who Controls It |
|--------|------------------|-----------------|
| **Payment Method Selection** | Paynow's page | **Paynow** |
| **Card/Bank Details Entry** | Paynow's page | **Paynow** (secure) |
| **Payment Processing** | Paynow + Payment Provider | **Paynow** |
| **Order Creation** | Your Backend API | **You** |
| **Webhook Verification** | Your API | **You** |
| **Subscription Activation** | Your Backend | **You** |

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TICKTRACK PRO APP                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User navigates to /billing                                     │
│     ↓                                                               │
│  2. Clicks "Upgrade Your Plan" button                              │
│     ↓                                                               │
│  3. Fills form:                                                     │
│     - Plan: Enterprise                                              │
│     - Cycle: Monthly                                                │
│     - Currency: USD                                                 │
│     - Method: Paynow                                                │
│     ↓                                                               │
│  4. Clicks "Continue to Payment"                                   │
│     ↓                                                               │
│  5. Frontend calls POST /api/billing/paynow/initiate               │
│     ↓                                                               │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      TICKTRACK BACKEND                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  6. Backend creates Paynow payment:                                │
│     - paynow.createPayment(ref, email)                             │
│     - paynow.add(description, amount)                              │
│     ↓                                                               │
│  7. Backend calls paynow.send(paynowPayment)                       │
│     ↓                                                               │
│  8. Receives redirectUrl from Paynow                               │
│     ↓                                                               │
│  9. Returns {redirectUrl: "https://paynow.co.zw/..."}              │
│     ↓                                                               │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      PAYNOW PLATFORM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  10. Browser redirects: window.location.href = redirectUrl         │
│      ↓                                                              │
│  11. User sees Paynow payment page with all methods:               │
│      - Visa / Mastercard / ZIM-Switch                              │
│      - EcoCash / OneMoney / Telecash                               │
│      ↓                                                              │
│  12. User selects payment method (e.g., EcoCash)                   │
│      ↓                                                              │
│  13. User enters credentials (phone, PIN)                          │
│      ↓                                                              │
│  14. Payment processed by payment provider                         │
│      ↓                                                              │
│  15. Paynow sends webhook to /api/payments/paynow/webhook          │
│      ↓                                                              │
│  16. Paynow redirects user to return URL                           │
│      ↓                                                              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  TICKTRACK BACKEND (WEBHOOK)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  17. Webhook handler verifies hash                                 │
│      ↓                                                              │
│  18. Updates payment status: "success"                             │
│      ↓                                                              │
│  19. Activates subscription: status = "ACTIVE"                     │
│      ↓                                                              │
│  20. Sends confirmation email                                      │
│      ↓                                                              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  21. Redirected to /billing/payment/return                         │
│      ↓                                                              │
│  22. Sees "✓ Payment Successful!"                                  │
│  23. Subscription is now ACTIVE                                    │
│  24. Can access all Pro features                                   │
│      ↓                                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Code References

### Billing Page Component
- **File:** [app/billing/page.tsx](app/billing/page.tsx)
- **Button Click:** Line 735-750 (Continue to Payment)
- **Handle Upgrade Function:** Lines 73-95

### API Endpoint
- **File:** [app/api/billing/paynow/initiate/route.ts](app/api/billing/paynow/initiate/route.ts)
- **Paynow Integration:** Lines 100-135
- **Response with redirectUrl:** Lines 130-140

### Webhook Handler
- **File:** [app/api/payments/paynow/webhook/route.ts](app/api/payments/paynow/webhook/route.ts)
- **Webhook Verification:** Lines 40-60
- **Subscription Activation:** Lines 60-80

### Service Layer
- **File:** [lib/paynow-service.ts](lib/paynow-service.ts)
- **PaynowService.createPayment():** Lines 37-65

---

## Important Notes

### ✅ What Your App Does
1. Collects order details (plan, billing cycle, currency)
2. Creates payment object with Paynow SDK
3. Gets redirectUrl from Paynow
4. Redirects user to Paynow
5. Receives webhook confirmation
6. Activates subscription

### ❌ What Your App Does NOT Do
1. **Does NOT show payment methods** - Paynow shows them
2. **Does NOT process payments** - Paynow processes them
3. **Does NOT collect card details** - Paynow collects them
4. **Does NOT handle payment credentials** - Paynow handles them

### 🔒 Security Benefits
- **PCI DSS Compliance:** Card data never touches your servers
- **Secure Redirect:** User redirected to Paynow's HTTPS domain
- **Hash Verification:** Webhook verified with secret key
- **No Sensitive Data:** Your app never sees card/PIN/passwords

---

## Testing the Flow

### Test Steps
1. Go to `https://ticktrackpro.com/billing`
2. Click "Upgrade Your Plan"
3. Select Plan, Cycle, Currency, and **"Paynow (Mobile Money)"**
4. Click **"Continue to Payment"**
5. ✓ You should be redirected to Paynow's payment page
6. ✓ You should see all payment method options
7. (In production: Complete payment → Webhook fires → Subscription activates)

### Test Credentials
- See `USER_CREDENTIALS.md` for Paynow test merchant account

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Redirect doesn't work | Missing redirectUrl | Check API response in browser console |
| Paynow page blank | Invalid merchant credentials | Verify PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY in `.env` |
| Payment methods not showing | Paynow API error | Check payment amount is valid |
| Webhook not received | resultUrl misconfigured | Verify PAYNOW_RESULT_URL in `.env` |

---

**Last Updated:** January 14, 2026
