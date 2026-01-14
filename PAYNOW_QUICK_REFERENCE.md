# Paynow Integration - Quick Visual Summary

## ONE-PAGE SUMMARY: Where Users Click to Access Paynow

### 👇 THE FLOW IN 3 SCREENS

---

## SCREEN 1: Billing Page (TickTrack)

```
URL: https://ticktrackpro.com/billing

┌─────────────────────────────────────────────────────────┐
│                 Billing & Subscription                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current Subscription: TRIAL                           │
│  Status: Active (5 days remaining)                     │
│                                                         │
│  Plan: Basic                                            │
│  Price: Free (Trial)                                    │
│                                                         │
│              ╔═════════════════════════╗               │
│              ║    ✓ Upgrade Now        ║ ← CLICK THIS  │
│              ╚═════════════════════════╝               │
│                                                         │
│  Or click "Change Plan" button below...                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Payment History                                        │
│  (None yet)                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**User Action:** Clicks "Upgrade Now" or "Change Plan"

---

## SCREEN 2: Upgrade Dialog (Still TickTrack)

```
Dialog Modal Opens:

╔════════════════════════════════════════════════════════╗
║         Upgrade Your Plan                              ║
║  Select a plan and payment method to continue          ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Select Plan                                           ║
║  ┌─────────┐  ┌──────┐  ┌──────────────────────┐     ║
║  │ Basic   │  │ Pro  │  │ ●  Enterprise        │     ║
║  │ $29/mo  │  │$79/mo│  │ Full-featured  $199  │     ║
║  └─────────┘  └──────┘  │ Popular ▲            │     ║
║                         └──────────────────────┘     ║
║                                                        ║
║  Billing Cycle                                         ║
║  ●  Monthly          ○ Yearly (-17% discount)        ║
║                                                        ║
║  Payment Method                                        ║
║  ┌──────────────────────────────────────────────┐    ║
║  │ ● Paynow (Mobile Money)                      │    ║
║  │   Ecocash, OneMoney, Telecash                │    ║
║  └──────────────────────────────────────────────┘    ║
║                                                        ║
║  ┌──────────────────────────────────────────────┐    ║
║  │ ○ Bank Transfer                              │    ║
║  │   Direct bank deposit                        │    ║
║  └──────────────────────────────────────────────┘    ║
║                                                        ║
║       [Cancel]     ╔════════════════════════════╗     ║
║                    ║ Continue to Payment        ║ ←   ║
║                    ║ (Paynow)                   ║ CLICK║
║                    ╚════════════════════════════╝     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

**User Action:** 
1. Selects "Enterprise" plan
2. Selects "Monthly" billing
3. Selects "Paynow (Mobile Money)" 
4. **Clicks "Continue to Payment"** ← CRITICAL CLICK

---

## SCREEN 3: Paynow Payment Page (NOT Your App)

```
Browser redirects to:
https://www.paynow.co.zw/payment/xyz789...

(This is Paynow's hosted payment page, not your domain)

╔════════════════════════════════════════════════════════╗
║           PAYNOW PAYMENT GATEWAY                       ║
║                (Paynow's servers)                      ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  ORDER SUMMARY                                         ║
║  ─────────────────────────────────────────────────    ║
║  TickTrack Pro Enterprise - Monthly                   ║
║  Amount: USD $199.00                                   ║
║  Processing Fee: USD $0.00                            ║
║  ─────────────────────────────────────────────────    ║
║  TOTAL: USD $199.00                                    ║
║                                                        ║
║  SELECT PAYMENT METHOD                                 ║
║  ─────────────────────────────────────────────────    ║
║                                                        ║
║  💳 CARD PAYMENTS                                      ║
║  ○ Visa Card                                           ║
║  ○ Mastercard                                          ║
║                                                        ║
║  📱 MOBILE MONEY (POPULAR)                             ║
║  ● EcoCash (Econet) ← DEFAULT SELECTED               ║
║  ○ OneMoney (Vodafone)                                ║
║  ○ Telecash (NetOne)                                  ║
║  ○ InnBucks                                            ║
║                                                        ║
║  🏦 BANK TRANSFERS                                     ║
║  ○ ZIM-Switch                                          ║
║                                                        ║
║       [← Back]      ╔════════════════════════╗        ║
║                     ║  Proceed with EcoCash  ║        ║
║                     ╚════════════════════════╝        ║
║                                                        ║
║  (Payment methods selected here, NOT in your app)    ║
║  (Card details entered here, NOT in your app)        ║
║  (All secure - PCI DSS compliant)                    ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

**User Actions:**
1. Sees all available payment methods
2. Can select different method if desired
3. Clicks "Proceed with [Method]"
4. Enters payment credentials (phone/PIN/card)
5. Payment processes securely

---

## 🔄 What Happens Next (Behind the Scenes)

```
PAYNOW SIDE (User doesn't see this)
┌─────────────────────────────────┐
│ Payment processes               │
│ (EcoCash, Vodafone, etc)        │
└─────────────────────────────────┘
         ↓
WEBHOOK NOTIFICATION (Your Backend)
┌─────────────────────────────────┐
│ Paynow POSTs to your API        │
│ /api/payments/paynow/webhook    │
│                                 │
│ Status: "complete"              │
│ Amount: 199 USD                 │
│ Reference: SUB-xxx-1705256100   │
└─────────────────────────────────┘
         ↓
YOUR APP (Backend)
┌─────────────────────────────────┐
│ Verifies webhook hash           │
│ Updates payment status          │
│ Activates subscription          │
│ Sends confirmation email        │
└─────────────────────────────────┘
         ↓
USER REDIRECT
┌─────────────────────────────────┐
│ Paynow redirects user to:       │
│ /billing/payment/return         │
│                                 │
│ User sees:                      │
│ "✓ Payment Successful!"         │
│ "Subscription Active"           │
└─────────────────────────────────┘
```

---

## Key Points

### ✅ What You're NOT Doing
- ✗ NOT showing payment methods (Paynow shows them)
- ✗ NOT collecting card numbers (Paynow collects them)
- ✗ NOT storing payment details (Paynow stores them)
- ✗ NOT processing payments (Paynow processes them)

### ✅ What You ARE Doing
- ✓ Collecting plan selection
- ✓ Creating payment on backend
- ✓ Sending to Paynow API
- ✓ Getting redirect URL from Paynow
- ✓ Redirecting user to Paynow
- ✓ Receiving webhook confirmation
- ✓ Activating subscription

### 🔒 Security
- **PCI DSS Compliant** - Your app never touches card data
- **HTTPS Only** - All communication encrypted
- **Hash Verified** - Webhooks authenticated
- **Hosted Gateway** - Paynow handles sensitive data

---

## Code References

### The Critical Redirect (Frontend)
**File:** [app/billing/page.tsx](app/billing/page.tsx#L735-L750)

```typescript
<Button onClick={() => handleUpgrade()}>
  Continue to Payment
</Button>

// This calls:
const handleUpgrade = async () => {
  const response = await fetch('/api/billing/paynow/initiate', {...})
  const {redirectUrl} = await response.json()
  
  // ← THIS LINE SENDS USER TO PAYNOW:
  window.location.href = redirectUrl
}
```

### Backend Creates Payment
**File:** [app/api/billing/paynow/initiate/route.ts](app/api/billing/paynow/initiate/route.ts#L100-L135)

```typescript
// Create payment with Paynow SDK
const paynowPayment = paynow.createPayment(reference, email)
paynowPayment.add('TickTrack Pro Enterprise - monthly', 199)

// Send to Paynow - get redirectUrl
const response = await paynow.send(paynowPayment)

// Return redirectUrl to frontend
return {redirectUrl: response.redirectUrl}
```

### Webhook Handler
**File:** [app/api/payments/paynow/webhook/route.ts](app/api/payments/paynow/webhook/route.ts)

```typescript
// Paynow POSTs payment confirmation here
export async function POST(request: NextRequest) {
  const webhookData = await request.json()
  
  // Verify it's from Paynow
  const isValid = paynow.verifyHash(webhookData, webhookData.hash)
  
  // Activate subscription
  if (isValid && webhookData.status === 'complete') {
    await activateSubscription(webhookData.reference)
  }
}
```

---

## Timeline

```
00:00  User on /billing page
  ↓
00:05  Clicks "Upgrade Now"
  ↓
00:10  Dialog opens - selects Enterprise, Monthly, Paynow
  ↓
00:15  ✓ Clicks "Continue to Payment" (Still on your domain)
  ↓
00:20  Browser POST → /api/billing/paynow/initiate
  ↓
00:25  Backend calls paynow.send()
  ↓
00:30  Backend returns {redirectUrl}
  ↓
00:35  ✓ window.location.href = redirectUrl
  ↓
00:40  ✓ USER LEAVES YOUR DOMAIN (now on Paynow)
  ↓
00:45  User selects EcoCash on Paynow page
  ↓
00:50  User enters phone & PIN on Paynow
  ↓
01:00  Payment processed by EcoCash provider
  ↓
01:05  Paynow POSTs webhook to your API
  ↓
01:10  Your backend activates subscription
  ↓
01:15  Paynow redirects user back to your app
  ↓
01:20  ✓ User sees "Payment Successful!"
```

---

## Direct Answer to Your Question

### "Where exactly do we click and go to Paynow?"

**Answer:** 
The **"Continue to Payment"** button in the Upgrade Dialog triggers the redirect.

**Technical Path:**
```
User Clicks "Continue to Payment" Button
    ↓
handleUpgrade() function in app/billing/page.tsx
    ↓
POST /api/billing/paynow/initiate (to backend)
    ↓
Backend creates payment with paynow.send()
    ↓
Paynow returns redirectUrl
    ↓
Frontend executes: window.location.href = redirectUrl
    ↓
BROWSER NAVIGATES TO PAYNOW.CO.ZW
```

**User's Perspective:**
1. Fills form (plan, cycle, payment method)
2. Clicks **"Continue to Payment"** ← **THIS IS THE CLICK**
3. Page briefly loads (showing "Processing...")
4. Browser redirects to Paynow
5. Sees Paynow payment page with all payment methods
6. Selects & completes payment on Paynow
7. Returns to your app

---

**The key insight:** Your app only handles steps 1-2 and 7. Steps 3-6 are 100% Paynow's responsibility.

---

Generated: January 14, 2026
