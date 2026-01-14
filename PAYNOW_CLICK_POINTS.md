# Paynow Integration - Exact Click Points in TickTrack UI

## Where Users Click to Go to Paynow

### Location 1: Billing Page - "Upgrade Your Plan" Button

**URL:** `https://ticktrackpro.com/billing`

```
┌──────────────────────────────────────────────────────────────┐
│                     Billing & Subscription                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Current Subscription                      │
│                                                              │
│  Plan: (none - Trial)                                        │
│  Status: TRIAL                                               │
│  Days Left: 5 days                                           │
│                                                              │
│  [Change Plan]  ← CLICK THIS to open dialog                 │
│                                                              │
│                    or                                        │
│                                                              │
│  [Upgrade Now]  ← CLICK THIS if trial ending soon           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Code:** [app/billing/page.tsx](app/billing/page.tsx#L264-L275)

```tsx
<Button 
  onClick={() => setShowUpgradeDialog(true)}
  className="bg-blue-600"
>
  Upgrade Now
</Button>
```

---

### Location 2: Upgrade Dialog - Payment Method Selection

After clicking above, a dialog opens showing:

```
╔════════════════════════════════════════════════════════╗
║              Upgrade Your Plan                         ║
║  Select a plan and payment method to continue          ║
╚════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────┐
│ Select Plan                                            │
├────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│ │  Basic   │  │   Pro    │  │  ● Enterprise        │ │
│ │          │  │          │  │  Full-featured...    │ │
│ │  $29/mo  │  │  $79/mo  │  │  $199/mo   (Popular) │ │
│ └──────────┘  └──────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Billing Cycle                                          │
├────────────────────────────────────────────────────────┤
│ ● Monthly          ○ Yearly (Save 17%)               │
│                     USD ($) ▼                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Payment Method                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ● Paynow (Mobile Money)                          │ │
│ │   Ecocash, OneMoney, Telecash                    │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ○ Bank Transfer                                  │ │
│ │   Direct bank deposit                            │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                                                        │
│  [Cancel]          [Continue to Payment] ← CLICK ME   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Code:** [app/billing/page.tsx](app/billing/page.tsx#L688-L751)

```tsx
<Button
  onClick={() => {
    if (selectedPaymentMethod === 'paynow') {
      handleUpgrade()  // ← Sends to Paynow
    } else {
      handlePopUpload()  // ← Bank transfer flow
    }
  }}
  disabled={upgradeLoading || uploadingPop || !selectedPlan}
>
  {selectedPaymentMethod === 'paynow' ? 
    'Continue to Payment' : 
    'Submit Payment Proof'
  }
</Button>
```

---

### Location 3: What Happens When User Clicks

#### **Click 1: User selects "Paynow (Mobile Money)"**

```tsx
<label className="...">
  <input
    type="radio"
    name="paymentMethod"
    value="paynow"
    checked={selectedPaymentMethod === 'paynow'}
    onChange={(e) => setSelectedPaymentMethod(e.target.value)}  // ← Sets to 'paynow'
  />
  <div>
    <h4>Paynow (Mobile Money)</h4>
    <p>Ecocash, OneMoney, Telecash</p>
  </div>
</label>
```

#### **Click 2: User clicks "Continue to Payment" button**

```tsx
// This function executes:
const handleUpgrade = async () => {
  setPaymentError('')
  setUpgradeLoading(true)

  try {
    // Backend API call
    const paymentResponse = await fetch('/api/billing/paynow/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: selectedPlan,           // 'ENTERPRISE'
        billingCycle: selectedBillingCycle,  // 'monthly'
        currency: selectedCurrency    // 'USD'
      })
    })

    const paymentData = await paymentResponse.json()
    
    // ✅ THE CRITICAL REDIRECT:
    if (paymentData.redirectUrl) {
      window.location.href = paymentData.redirectUrl  // ← USER LEAVES YOUR APP HERE!
      // User is now sent to: https://www.paynow.co.zw/payment/xyz...
    }
  } finally {
    setUpgradeLoading(false)
  }
}
```

---

## Complete Flow Visualization

```
USER CLICKS "Continue to Payment"
              ↓
       FRONTEND RECEIVES CLICK
              ↓
    JavaScript handleUpgrade() executes
              ↓
   POST to /api/billing/paynow/initiate
              ↓
   BACKEND CREATES PAYNOW PAYMENT
   - paynow.createPayment(ref, email)
   - paynow.send(paynowPayment)
              ↓
  PAYNOW API RETURNS REDIRECT URL
   {
     redirectUrl: "https://www.paynow.co.zw/payment/abc123xyz"
   }
              ↓
   FRONTEND RECEIVES RESPONSE
              ↓
   window.location.href = redirectUrl
              ↓
   BROWSER NAVIGATES TO PAYNOW
              ↓
   ┌─────────────────────────────────────────┐
   │     PAYNOW PAYMENT PAGE                 │
   ├─────────────────────────────────────────┤
   │ Select Payment Method:                  │
   │ ○ Visa Card                             │
   │ ○ Mastercard                            │
   │ ○ ZIM-Switch                            │
   │ ● EcoCash                               │
   │ ○ OneMoney                              │
   │ ○ Telecash                              │
   │                                         │
   │ [Proceed with EcoCash]                  │
   └─────────────────────────────────────────┘
              ↓
   USER SELECTS & ENTERS PAYMENT METHOD
   (ALL ON PAYNOW'S SECURE SERVERS)
              ↓
   PAYMENT PROCESSES
              ↓
   PAYNOW SENDS WEBHOOK TO YOUR BACKEND
              ↓
   SUBSCRIPTION ACTIVATED
              ↓
   USER REDIRECTED BACK TO YOUR APP
   (https://ticktrackpro.com/billing/payment/return)
              ↓
   USER SEES "✓ Payment Successful!"
```

---

## The 3 Key Redirect Points

### Redirect #1: From Your App to Paynow
```javascript
// In app/billing/page.tsx
window.location.href = 'https://www.paynow.co.zw/payment/abc123xyz'
// User leaves your domain and goes to Paynow
```

### Redirect #2: Backend Webhook (User doesn't see this)
```
Paynow → POST to /api/payments/paynow/webhook
Your backend receives payment confirmation
No user interaction
```

### Redirect #3: From Paynow Back to Your App
```
Paynow → Redirect to https://ticktrackpro.com/billing/payment/return
User returns to your app
Subscription is now ACTIVE
```

---

## API Endpoints Involved

### Frontend → Backend
```
POST /api/billing/paynow/initiate
BODY: {plan, billingCycle, currency}
RESPONSE: {redirectUrl, pollUrl}
```

**File:** [app/api/billing/paynow/initiate/route.ts](app/api/billing/paynow/initiate/route.ts)

### Paynow → Backend (Webhook)
```
POST /api/payments/paynow/webhook
BODY: {id, reference, amount, status, pollUrl}
```

**File:** [app/api/payments/paynow/webhook/route.ts](app/api/payments/paynow/webhook/route.ts)

---

## Payment Methods Available on Paynow

When user is redirected to Paynow and clicks "Select Payment Method", they see:

```
┌─────────────────────────────────────────────────────┐
│         PAYMENT METHOD SELECTION (PAYNOW PAGE)      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  💳 CARD PAYMENTS                                   │
│  ○ Visa Card                                        │
│  ○ Mastercard                                       │
│                                                     │
│  📱 MOBILE MONEY (POPULAR)                          │
│  ○ EcoCash (Econet) 🇿🇼                             │
│  ○ OneMoney (Vodafone) 🇿🇼                          │
│  ○ Telecash (NetOne) 🇿🇼                            │
│  ○ InnBucks                                         │
│                                                     │
│  🏦 BANK TRANSFER                                   │
│  ○ ZIM-Switch                                       │
│                                                     │
│  [← Back] [Select →]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**This payment method selection is controlled by Paynow, not your app.**

Your app only:
1. Collects the order details
2. Sends them to Paynow
3. Redirects user to Paynow
4. Receives webhook confirmation

---

## User Experience Timeline

| Time | Location | Action |
|------|----------|--------|
| 0:00 | TickTrack Billing | User views billing page |
| 0:05 | TickTrack Billing | User clicks "Upgrade Now" |
| 0:10 | TickTrack Dialog | User selects Enterprise plan |
| 0:15 | TickTrack Dialog | User selects Monthly cycle |
| 0:20 | TickTrack Dialog | User selects "Paynow (Mobile Money)" |
| 0:25 | TickTrack Dialog | **User clicks "Continue to Payment"** ← KEY CLICK |
| 0:30 | TickTrack (redirecting) | `window.location.href` executes |
| 0:35 | **Paynow Payment Page** | **User is now on Paynow, NOT your app** |
| 0:40 | Paynow | User selects "EcoCash" |
| 0:45 | Paynow | User enters phone: 263771234567 |
| 0:50 | Paynow/EcoCash | Payment processes |
| 1:00 | Paynow Backend | Paynow POSTs webhook to your API |
| 1:05 | TickTrack Backend | Your webhook handler activates subscription |
| 1:10 | Paynow | Paynow redirects user back to your app |
| 1:15 | TickTrack Return Page | User sees "✓ Payment Successful!" |
| 1:20 | TickTrack Dashboard | Subscription is ACTIVE |

---

## Security Flow

```
┌─────────────────────────────────────────────────────┐
│ YOUR APP (TickTrack)                                │
│ ✓ Can see: Plan, Amount, Email, Tenant ID          │
│ ✗ CANNOT see: Card numbers, PINs, Passwords        │
└─────────────────────────────────────────────────────┘
           ↓ (HTTPS)
┌─────────────────────────────────────────────────────┐
│ PAYNOW GATEWAY (Hosted Payment Page)               │
│ ✓ Can see: All sensitive payment data               │
│ ✓ Processes: Payment securely                       │
│ ✓ Returns: Confirmation hash                        │
└─────────────────────────────────────────────────────┘
           ↓ (HTTPS Webhook)
┌─────────────────────────────────────────────────────┐
│ YOUR BACKEND                                        │
│ ✓ Receives: Payment status + hash                   │
│ ✓ Verifies: Hash matches secret key                 │
│ ✓ Activates: Subscription                           │
│ ✗ NEVER handles: Card details                       │
└─────────────────────────────────────────────────────┘
```

---

## Summary

### Where Users Click to Go to Paynow

| Step | Location | Component | What Happens |
|------|----------|-----------|--------------|
| 1 | Billing Page | "Upgrade Now" button | Opens upgrade dialog |
| 2 | Upgrade Dialog | Select "Paynow (Mobile Money)" | Sets payment method |
| 3 | Upgrade Dialog | **"Continue to Payment"** | **Calls backend API** |
| 4 | Frontend JS | `handleUpgrade()` | Creates payment on backend |
| 5 | Backend | `/api/billing/paynow/initiate` | Sends to Paynow SDK |
| 6 | Paynow SDK | `paynow.send()` | Returns redirect URL |
| 7 | Frontend | `window.location.href = redirectUrl` | **Redirects to Paynow** |
| 8 | **PAYNOW PAYMENT PAGE** | **Payment method selection** | **User selects EcoCash, etc** |

**The critical click is step 3: "Continue to Payment"** - that's when the user leaves your app.

---

**Generated:** January 14, 2026
