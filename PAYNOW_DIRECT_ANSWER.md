# Direct Answer: Where to Click to Access Paynow

## Your Question
> "In our UI, where exactly will we click and then go to Paynow platform? Research online on how Paynow is used or is linked to app UI, to select method of payment."

---

## THE ANSWER IN 3 WORDS

**"Continue to Payment" button**

---

## DETAILED EXPLANATION

### The Exact User Flow

#### **Step 1: Navigate to Billing Page**
- **URL:** `https://ticktrackpro.com/billing`
- **What user sees:** Current subscription, upgrade options

#### **Step 2: Click "Upgrade Now" Button**
```
On the Billing Page, click:
┌────────────────────┐
│  Upgrade Now       │  ← USER CLICKS HERE (1st click)
└────────────────────┘

A dialog modal opens showing upgrade options
```

#### **Step 3: Fill Out Upgrade Form**
```
Inside the dialog, user:
1. Selects Plan (Basic, Pro, or Enterprise)
2. Selects Billing Cycle (Monthly or Yearly)
3. Selects Payment Method:
   - Paynow (Mobile Money)  ← Select this
   - Bank Transfer
```

#### **Step 4: Click "Continue to Payment" Button**
```
At bottom of dialog:
┌──────────────────────────────┐
│ Continue to Payment          │  ← USER CLICKS HERE (2nd click)
│ (Takes you to Paynow)        │
└──────────────────────────────┘

THIS IS THE BUTTON THAT REDIRECTS YOU TO PAYNOW!
```

#### **Step 5: Browser Redirects to Paynow**
```
After clicking "Continue to Payment":

Your Domain (ticktrackpro.com)
         ↓
         (redirect)
         ↓
Paynow Domain (paynow.co.zw)

You now see Paynow's payment page
with all payment method options
```

---

## Code That Makes This Happen

### **Frontend Button (app/billing/page.tsx)**
```tsx
<Button
  onClick={() => handleUpgrade()}
  disabled={upgradeLoading || !selectedPlan}
>
  {selectedPaymentMethod === 'paynow' ? 
    'Continue to Payment' :    // ← This text shows when Paynow selected
    'Submit Payment Proof'      // ← This shows when Bank Transfer selected
  }
</Button>
```

### **The Handler Function**
```typescript
const handleUpgrade = async () => {
  // Step 1: Call backend API
  const response = await fetch('/api/billing/paynow/initiate', {
    method: 'POST',
    body: JSON.stringify({
      plan: selectedPlan,
      billingCycle: selectedBillingCycle,
      currency: selectedCurrency
    })
  })

  // Step 2: Get redirect URL from backend
  const data = await response.json()
  
  // Step 3: REDIRECT USER TO PAYNOW
  if (data.redirectUrl) {
    window.location.href = data.redirectUrl
    // Browser now goes to: https://www.paynow.co.zw/payment/xyz789...
  }
}
```

### **Backend API (app/api/billing/paynow/initiate/route.ts)**
```typescript
// Backend receives plan, cycle, currency from frontend

// Step 1: Create payment object
const paynowPayment = paynow.createPayment(uniqueRef, email)
paynowPayment.add('TickTrack Pro Enterprise - monthly', 199)

// Step 2: Send to Paynow API
const response = await paynow.send(paynowPayment)

// Step 3: Return redirect URL to frontend
return {
  redirectUrl: response.redirectUrl  // e.g., https://paynow.co.zw/payment/abc123
}
```

---

## What Happens on Paynow's Page

Once redirected to Paynow (https://paynow.co.zw/payment/xyz789), user sees:

```
╔═══════════════════════════════════════════════╗
║   PAYNOW PAYMENT PAGE                         ║
║   (Paynow handles payment method selection)   ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Order Details:                               ║
║  - TickTrack Pro Enterprise                   ║
║  - Amount: $199 USD                           ║
║                                               ║
║  💳 VISA                                      ║
║  💳 MASTERCARD                                ║
║  💳 ZIM-SWITCH                                ║
║  📱 ECOCASH              ← Most users pick    ║
║  📱 ONEMONEY               this or this       ║
║  📱 TELECASH             ←                    ║
║  📱 INNBUCKS                                  ║
║                                               ║
║  After selecting payment method,              ║
║  user enters credentials (phone/PIN/card)    ║
║  on Paynow's secure servers                  ║
║                                               ║
╚═══════════════════════════════════════════════╝

KEY POINT: Payment method selection happens HERE,
NOT in your app. Paynow shows all available methods.
```

---

## How Paynow Integration Works

### **Industry Standard Flow (Used by Every SaaS)**

```
┌──────────────────────────────────┐
│ Your App                         │
│ (Collects order info)            │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Your Backend                     │
│ (Creates payment)                │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Paynow API                       │
│ (Returns redirect URL)           │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ USER'S BROWSER                   │
│ (Redirects to Paynow)            │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Paynow Payment Page              │
│ (Shows payment methods)           │
│ (User selects & pays)            │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Your Backend (Webhook)           │
│ (Receives confirmation)          │
└──────────────────────────────────┘
            ↓
┌──────────────────────────────────┐
│ Your App                         │
│ (Shows "Payment Successful!")    │
└──────────────────────────────────┘
```

---

## Visual UI Map

### Screen 1: Billing Page
```
URL: https://ticktrackpro.com/billing

                    Upgrade Now ← Click 1
                        ↓
```

### Screen 2: Upgrade Dialog (Modal)
```
URL: https://ticktrackpro.com/billing (dialog overlay)

    Plan Selection: [Basic] [Pro] [Enterprise]
    Billing Cycle: [Monthly] [Yearly]
    Currency: [USD] [ZWL]
    Payment Method: [Paynow] [Bank Transfer]
    
    Continue to Payment ← Click 2 (CRITICAL)
                        ↓
```

### Screen 3: Paynow Payment Page
```
URL: https://www.paynow.co.zw/payment/xyz789

    Order Summary: TickTrack Pro Enterprise - $199
    
    Select Payment Method:
    ○ Visa
    ○ Mastercard
    ○ ZIM-Switch
    ● EcoCash         ← User selects here
    ○ OneMoney
    ○ Telecash
    
    [Proceed with EcoCash]
    
    User enters phone/PIN on this page
```

---

## Summary Table

| What | Where | Who Controls | User Can See |
|------|-------|--------------|--------------|
| **Plan Selection** | Your App | You | ✓ Yes |
| **Amount/Pricing** | Your App | You | ✓ Yes |
| **Payment Method Selection** | Paynow's Page | Paynow | ✓ Yes |
| **Card Entry** | Paynow's Page | Paynow | ✓ Yes (secure) |
| **Bank Details** | Paynow's Page | Paynow | ✓ Yes (secure) |
| **Phone/PIN Entry** | Paynow's Page | Paynow | ✓ Yes (secure) |
| **Payment Processing** | Paynow's Servers | Paynow | ✗ No (backend) |

---

## Security Model

```
YOUR APP              PAYNOW GATEWAY        PAYMENT PROVIDER
┌────────────┐       ┌──────────────┐      ┌─────────────┐
│ Collects   │       │ Shows        │      │ Processes   │
│ Plan       │ ───→  │ Payment      │ ───→ │ Payment     │
│ Price      │       │ Methods      │      │             │
│ Email      │       │ Collects     │      │ (EcoCash,   │
│            │       │ Card Data    │      │  Card, etc) │
│ NEVER      │       │ Processes    │      │             │
│ touches:   │       │ Payment      │      │ Returns:    │
│ - Cards    │       │              │      │ Success/    │
│ - PINs     │       │ Returns:     │      │ Failure     │
│ - Passwords│       │ Status       │      │             │
└────────────┘       └──────────────┘      └─────────────┘
```

---

## Testing This Flow

### Local Testing
1. Go to: `https://ticktrackpro.com/billing`
2. Click: "Upgrade Now" or "Change Plan"
3. Select: Enterprise, Monthly, Paynow
4. Click: **"Continue to Payment"**
5. ✓ You should see Paynow's payment page
6. ✓ You should see all payment method options
7. (Don't complete payment in test mode)

### In Production
Same steps, but:
- Payment will process
- Subscription will activate
- Email confirmation will be sent

---

## Files Referenced

- **Billing Page:** [app/billing/page.tsx](app/billing/page.tsx#L735-L750) - Line 735-750
- **Payment Handler:** [app/billing/page.tsx](app/billing/page.tsx#L73-L95) - Line 73-95 (handleUpgrade function)
- **Backend API:** [app/api/billing/paynow/initiate/route.ts](app/api/billing/paynow/initiate/route.ts) - Lines 100-135
- **Webhook Handler:** [app/api/payments/paynow/webhook/route.ts](app/api/payments/paynow/webhook/route.ts)

---

## Final Answer

### The Exact Click Path:

```
Billing Page
    ↓
Click "Upgrade Now"
    ↓
Upgrade Dialog Appears
    ↓
Select Plan, Cycle, Currency
    ↓
Select "Paynow (Mobile Money)"
    ↓
Click "Continue to Payment" ← THIS BUTTON
    ↓
Backend Creates Payment with Paynow SDK
    ↓
Backend Returns Redirect URL
    ↓
Browser Redirects to Paynow
    ↓
Paynow Shows Payment Methods
    ↓
User Selects Payment Method (EcoCash, Card, etc)
    ↓
User Enters Credentials
    ↓
Payment Processed
    ↓
User Redirected Back to Your App
```

**The key click:** **"Continue to Payment"** button in the Upgrade Dialog

---

Generated: January 14, 2026
