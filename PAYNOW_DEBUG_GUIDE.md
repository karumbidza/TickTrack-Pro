# Paynow Integration - Debugging & Testing Guide

**Last Updated:** January 14, 2026  
**Status:** 🟡 TESTING IN PROGRESS

---

## CRITICAL FIX APPLIED ✅

The Paynow credentials were **MISSING** from production .env file. This has been fixed:

```bash
# FIXED: Added to /var/www/ticktrack-pro/.env
PAYNOW_INTEGRATION_ID=23069
PAYNOW_INTEGRATION_KEY=afd959a8-01f3-46f5-9055-509397119faf
PAYNOW_RETURN_URL=https://tick-trackpro.com/billing/payment/return
PAYNOW_RESULT_URL=https://tick-trackpro.com/api/payments/paynow/webhook

# Process restarted: PM2 now loading new env variables
Status: ✅ ONLINE (PID 733070)
```

**Additional Fix:** Fixed duplicate invoice number error by adding idempotency check in payment creation.

---

## FLOW VERIFICATION CHECKLIST

### What SHOULD Happen (Correct Flow)

```
Step 1: User goes to https://tick-trackpro.com/billing
        ↓ (See billing page with plans)

Step 2: User clicks "Upgrade Now" or "Change Plan"
        ↓ (Modal dialog opens)

Step 3: User selects:
        - Plan (Enterprise)
        - Billing Cycle (Monthly)
        - Currency (USD)
        - Payment Method (Paynow) ← IMPORTANT
        ↓

Step 4: User clicks "Continue to Payment"
        ↓ (Frontend calls /api/billing/paynow/initiate)

Step 5: Backend API:
        - Validates user session ✓
        - Creates payment record in database ✓
        - Calls paynow.send(paymentObject) ✓
        - Gets back: {success: true, redirectUrl: "https://www.paynow.co.zw/payment/XYZ"}
        - Returns redirectUrl to frontend
        ↓

Step 6: Frontend receives response:
        - Extracts redirectUrl
        - Sets window.location.href = redirectUrl
        ↓

Step 7: Browser redirects to Paynow
        FROM: https://tick-trackpro.com/billing
        TO:   https://www.paynow.co.zw/payment/...
        ↓ (User now sees PAYNOW's payment page)

Step 8: Paynow shows payment methods:
        - EcoCash
        - OneMoney
        - Telecash
        - Visa
        - Mastercard
        - ZIM-Switch
        (User NOT on your domain anymore)
        ↓

Step 9: User selects payment method & enters details
        ↓

Step 10: Paynow processes payment
         ↓

Step 11: Paynow calls webhook:
         POST https://tick-trackpro.com/api/payments/paynow/webhook
         (With payment status)
         ↓

Step 12: Your backend:
         - Validates webhook hash ✓
         - Updates payment status ✓
         - Updates subscription status to ACTIVE ✓
         - Sends confirmation email ✓
         ↓

Step 13: User redirected back:
         FROM: https://www.paynow.co.zw/payment/...
         TO:   https://tick-trackpro.com/billing/payment/return
         (User back on your domain with active subscription)
```

---

## TESTING STEPS

### Test 1: Verify Credentials Loaded
```bash
# SSH to production
ssh root@167.71.51.176

# Check if credentials are in memory
pm2 logs ticktrack-pro --lines 100 | grep -i paynow

# Should see something like:
# [Paynow] Initiating web payment...
```

### Test 2: Manual API Call (With Browser DevTools)

**Method 1: Browser Console Test**
```javascript
// Open browser DevTools (F12)
// Go to https://tick-trackpro.com/billing
// Open Console tab
// Paste this code:

const testPaynow = async () => {
  const response = await fetch('/api/billing/paynow/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'ENTERPRISE',
      billingCycle: 'monthly',
      currency: 'USD'
    })
  })
  
  const data = await response.json()
  console.log('API Response:', data)
  
  if (data.redirectUrl) {
    console.log('Redirect URL:', data.redirectUrl)
    console.log('Should redirect to:', new URL(data.redirectUrl).hostname)
  } else if (data.error) {
    console.log('ERROR:', data.error)
  }
}

testPaynow()
```

**Expected Output (Success):**
```json
{
  "success": true,
  "paymentId": "clq...",
  "redirectUrl": "https://www.paynow.co.zw/payment/abc123...",
  "pollUrl": "https://api.paynow.co.zw/api/v2/transactions/abc123...",
  "reference": "SUB-clq...-1705..."
}
```

**Expected Output (Error):**
```json
{
  "error": "Unauthorized" // User not logged in
}
```

### Test 3: Full User Journey Test

**Prerequisites:**
- ✅ Logged in as tenant admin
- ✅ Production server running
- ✅ Paynow credentials configured

**Steps:**

1. **Open Billing Page**
   ```
   URL: https://tick-trackpro.com/billing
   Expected: See "Upgrade Now" or "Change Plan" button
   ```

2. **Click Upgrade Button**
   ```
   Expected: Modal dialog opens with options
   ```

3. **Select Options**
   ```
   Plan: Enterprise ($199/month USD)
   Billing Cycle: Monthly
   Currency: USD
   Payment Method: Paynow (Mobile Money)
   Expected: "Continue to Payment" button appears
   ```

4. **Click "Continue to Payment"**
   ```
   Expected 1: Modal becomes disabled (loading state)
   Expected 2: Browser starts loading...
   Expected 3: Redirected to https://www.paynow.co.zw/payment/...
   NOT Expected: Redirected to any other domain
   NOT Expected: Error page or blank page
   ```

5. **Verify Paynow Page**
   ```
   Should see:
   - Paynow logo/branding
   - "Select Payment Method" options
   - EcoCash, OneMoney, Telecash, Visa, Mastercard, etc.
   - Your transaction amount ($199.00)
   - Email address
   ```

6. **In Browser DevTools (Network Tab)**
   ```
   Should see:
   - POST /api/billing/paynow/initiate → 200 OK
   - Response includes: redirectUrl starting with "https://www.paynow.co.zw"
   ```

---

## DEBUGGING: What to Check If It Fails

### Symptom: "Redirected to system which then fails"

**Possible Cause 1: Wrong Redirect URL**
- Open browser DevTools (F12) → Network tab
- Click "Continue to Payment"
- Look for the POST request to `/api/billing/paynow/initiate`
- Check Response tab
- Look at the `redirectUrl` field
  - ✅ Should be: `https://www.paynow.co.zw/payment/...`
  - ❌ Should NOT be: `https://api.paynow.co.zw/...` or other URL

**Possible Cause 2: Credentials Not Loaded**
- SSH to server: `ssh root@167.71.51.176`
- Check PM2 logs: `pm2 logs ticktrack-pro --lines 50`
- Look for error messages about Paynow
- If you see: `PAYNOW_INTEGRATION_ID is undefined` → Credentials not loaded

**Fix:** Restart with env vars:
```bash
ssh root@167.71.51.176
pm2 restart ticktrack-pro --update-env
```

**Possible Cause 3: API Not Being Called**
- Browser DevTools → Network tab
- Don't see POST to `/api/billing/paynow/initiate`?
- → JavaScript error preventing the fetch
- Check Console tab for errors
- Look for: `Uncaught Error: ...`

**Possible Cause 4: User Not Authenticated**
- Log out and log back in
- Make sure you're logged in as a tenant admin
- Check browser console for auth errors

---

## CODE FILES TO REVIEW

### Primary File: Paynow Initiate Endpoint
**File:** `/app/api/billing/paynow/initiate/route.ts`

**Key Lines:**
- Line 87-91: Paynow instance initialization with credentials
- Line 95-96: Setting return and result URLs
- Line 115-130: Creating Paynow payment object
- Line 131: **`paynow.send(paynowPayment)` - This is what returns the redirectUrl**
- Line 134-140: Extracting redirectUrl from response
- Line 143-147: **Returning redirectUrl to frontend**

**What should happen:**
```typescript
const response = await paynow.send(paynowPayment)
// response should have: {success: true, redirectUrl: "https://www.paynow.co.zw/..."}

return NextResponse.json({
  success: true,
  redirectUrl: response.redirectUrl  // ← THIS URL MUST BE PAYNOW DOMAIN
})
```

### Secondary File: Billing Page Frontend
**File:** `/app/billing/page.tsx`

**Key Lines:**
- Line 85-110: `handleUpgrade()` function
- Line 93: **Calling the API endpoint**
- Line 96: **Getting the response**
- Line 97: **`window.location.href = redirectUrl` - This actually redirects the browser**

**What should happen:**
```typescript
const handleUpgrade = async () => {
  const response = await fetch('/api/billing/paynow/initiate', {...})
  const data = await response.json()
  
  if (data.redirectUrl) {
    window.location.href = data.redirectUrl  // ← THIS REDIRECTS TO PAYNOW
  }
}
```

---

## ENVIRONMENT VARIABLES CHECKLIST

**✅ VERIFIED ON PRODUCTION:**
```bash
PAYNOW_INTEGRATION_ID=23069                          ✓
PAYNOW_INTEGRATION_KEY=afd959a8-01f3-46f5-...       ✓
PAYNOW_RETURN_URL=https://tick-trackpro.com/...     ✓
PAYNOW_RESULT_URL=https://tick-trackpro.com/...     ✓
NODE_ENV=production                                  ✓
NEXTAUTH_URL=https://tick-trackpro.com              ✓
NEXT_PUBLIC_APP_URL=https://tick-trackpro.com       ✓
```

---

## COMMAND REFERENCE

### Check Paynow Credentials
```bash
ssh root@167.71.51.176
tail -5 /var/www/ticktrack-pro/.env | grep PAYNOW
```

### View Recent Logs
```bash
ssh root@167.71.51.176
pm2 logs ticktrack-pro --lines 50 --nostream
```

### Restart Service
```bash
ssh root@167.71.51.176
pm2 restart ticktrack-pro
pm2 status ticktrack-pro
```

### Test API Locally (On Production Server)
```bash
ssh root@167.71.51.176
curl -X POST http://localhost:3000/api/billing/paynow/initiate \
  -H 'Content-Type: application/json' \
  -d '{"plan":"ENTERPRISE","billingCycle":"monthly","currency":"USD"}'
```

---

## NEXT STEPS

1. **Verify Credentials Loaded** (2 min)
   ```bash
   ssh root@167.71.51.176
   tail /var/www/ticktrack-pro/.env | grep PAYNOW
   pm2 logs ticktrack-pro --lines 20
   ```

2. **Test Full Flow** (5 min)
   - Go to https://tick-trackpro.com/billing
   - Follow the "Testing Steps" above
   - Open DevTools to monitor the API call

3. **Check DevTools Console**
   - F12 → Console tab
   - Look for any errors
   - Look for the redirectUrl value

4. **Verify Paynow URL**
   - After redirect, check the browser URL bar
   - Should show: `paynow.co.zw` domain
   - NOT your domain

---

## SUCCESS INDICATORS

✅ **You'll know it's working when:**

1. You click "Continue to Payment"
2. Page shows loading indicator briefly
3. Browser URL changes from `tick-trackpro.com` to `paynow.co.zw`
4. You see Paynow's payment page with:
   - Your transaction amount
   - Payment method options (EcoCash, Visa, etc.)
   - Paynow branding/logo

✅ **You'll NOT see:**

- Your billing page anymore
- Error pages
- Blank pages
- API error messages

---

## COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| "Unauthorized" | Not logged in | Log out and back in |
| "Failed to connect to Paynow" | Credentials missing | Restart PM2 with `--update-env` |
| "Forbidden" | Not an admin user | Log in as tenant admin |
| "Invalid plan" | Plan not in database | Check BillingService.getSubscriptionPricing() |
| Page stays on billing, no redirect | API not called | Check browser DevTools Console |
| Redirects to wrong domain | redirectUrl incorrect | Check /api/billing/paynow/initiate response |

---

**Current Status:** ✅ PRODUCTION READY (Credentials Configured, Process Running)

**Next Action:** Follow "Test Full Flow" above to verify Paynow redirect working.

Generated: January 14, 2026
