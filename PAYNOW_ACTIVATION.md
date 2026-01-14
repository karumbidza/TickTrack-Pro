# Paynow Payment Integration - Activation Guide

## Overview
Paynow mobile money payment integration has been successfully activated in TickTrack Pro production environment. This enables businesses to accept payments directly through Paynow's ecosystem in Zimbabwe.

## Integration Credentials

### Production Credentials (Active)
- **Company:** UNASH HOPE DESIGNS
- **Integration Type:** 3rd Party Integration
- **Payment Link:** Tick-trackpro
- **Integration ID:** 23069
- **Integration Key:** afd959a8-01f3-46f5-9055-509397119faf

### Environment Configuration
The following environment variables have been configured in production:

```env
PAYNOW_INTEGRATION_ID=23069
PAYNOW_INTEGRATION_KEY=afd959a8-01f3-46f5-9055-509397119faf
PAYNOW_RETURN_URL=https://ticktrackpro.com/billing/payment/return
PAYNOW_RESULT_URL=https://ticktrackpro.com/api/payments/paynow/webhook
```

## Features Implemented

### 1. Payment Flow
**Location:** `/billing` page
**User Experience:**
1. User clicks "Upgrade Now" or "Change Plan" button
2. Presented with plan selection (Basic, Pro, Enterprise)
3. **NEW:** Required to enter Zimbabwe mobile number
4. Payment is initiated via Paynow
5. User redirected to Paynow payment gateway
6. After successful payment, user redirected to `/billing/payment/return`

### 2. Supported Payment Methods
Paynow supports the following mobile money networks:
- **Ecocash** (Econet) - Primary
- **Vodafone Money** (Vodafone)
- **NetOne Mobile Money** (NetOne)
- **Standard Chartered Bank Zimbabwe**
- **CBZ Bank**
- **CABS Bank**

### 3. Phone Number Validation
**Format Required:** Zimbabwe phone number
**Accepted Formats:**
- `263771234567` (international format)
- `+27771234567` (if using South African SIM)
- `0771234567` (local format - will be converted)

**Validation Rules:**
- Must be a valid Zimbabwe mobile number
- Operators: Econet (71/73), Vodafone (77), NetOne (78)
- 10-11 digits (depending on format)

### 4. User Interface Updates

#### Billing Page (`/billing/page.tsx`)
**New Features:**
- Mobile phone number input field in upgrade dialog
- Payment method display showing Paynow as selected method
- Supported networks display (Ecocash, Econet, Vodafone, NetOne)
- Error handling with user-friendly messages
- Loading state during payment processing

**UI Components:**
- Phone input with placeholder: "263771234567 or +27771234567"
- Help text: "Enter your Zimbabwe mobile number (Ecocash, Econet, Vodafone, NetOne)"
- Payment method info box showing supported networks
- "Pay with Paynow" button (replaces "Upgrade Now")

### 5. API Endpoints

#### POST `/api/billing/paynow/initiate`
**Purpose:** Initiate a Paynow payment request
**Request Body:**
```json
{
  "plan": "BASIC|PRO|ENTERPRISE",
  "billingCycle": "monthly|yearly",
  "currency": "USD|ZWL",
  "phone": "263771234567",
  "paymentMethod": "ecocash"
}
```

**Response:**
```json
{
  "success": true,
  "redirectUrl": "https://www.paynow.co.zw/...payment/link",
  "pollUrl": "https://api.paynow.co.zw/..."
}
```

#### POST `/api/billing/paynow/status`
**Purpose:** Check payment status
**Returns:** Current payment status and transaction details

#### POST `/api/billing/paynow/verify`
**Purpose:** Verify and process successful payment
**Webhook:** `/api/payments/paynow/webhook`

### 6. Payment Processing Flow

```
User → Select Plan → Enter Phone → Paynow Gateway → Mobile Device
                                        ↓
                          User Confirms Payment
                                        ↓
                          Paynow Processes Payment
                                        ↓
                    Success/Failure Webhook Callback
                                        ↓
                    Update Subscription Status in DB
                                        ↓
                    Redirect to /billing/payment/return
```

## Database Impact

### Payment Recording
Each successful payment is recorded with:
- Transaction ID
- Amount and Currency (USD/ZWL)
- Payment Method (PAYNOW)
- Payment Status (PENDING → SUCCESS/FAILED)
- Timestamp
- User Phone Number (masked for security)

### Subscription Activation
On successful payment:
1. Subscription plan activated
2. Current period dates set
3. Subscription status changed to ACTIVE
4. Trial period ended (if applicable)
5. User gains access to selected plan features

## Pricing Tiers

### Basic Plan
- Monthly: $29 USD / Z$1,160 ZWL
- Yearly: $290 USD / Z$11,600 ZWL (Save 17%)
- Up to 10 users
- Basic helpdesk & project management

### Pro Plan (Recommended)
- Monthly: $79 USD / Z$3,160 ZWL
- Yearly: $790 USD / Z$31,600 ZWL (Save 17%)
- Up to 50 users
- Advanced features + Contractor network
- Priority support

### Enterprise Plan
- Monthly: $199 USD / Z$7,960 ZWL
- Yearly: $1,990 USD / Z$79,600 ZWL (Save 17%)
- Unlimited users
- White-label + Custom integrations
- Dedicated support

## Security Features

### 1. Payment Validation
- Phone number format validation (Zimbabwe regex)
- Amount verification from pricing lookup
- Timestamp-based security
- Webhook signature verification

### 2. Error Handling
- Non-specific error messages (prevents user enumeration)
- Detailed logging for debugging
- Transaction ID tracking
- Automatic retry logic for network issues

### 3. Data Protection
- Phone numbers stored encrypted in database
- No sensitive payment data retained client-side
- HTTPS-only communication with Paynow
- API key stored in environment variables (never in code)

## Testing Checklist

### Local Testing (Development)
- [ ] Phone number format validation
- [ ] Payment dialog opens correctly
- [ ] Error messages display properly
- [ ] Loading states work correctly

### Production Testing
- [ ] Visit https://ticktrackpro.com/billing
- [ ] Click "Change Plan" or upgrade option
- [ ] Enter valid Zimbabwe phone number
- [ ] Select plan, billing cycle, and currency
- [ ] Click "Pay with Paynow"
- [ ] Verify redirect to Paynow gateway
- [ ] Simulate payment confirmation
- [ ] Verify webhook callback successful
- [ ] Check subscription activated in database
- [ ] Verify user access to features

### Payment Testing Scenarios
1. **Valid Payment:** Process complete subscription
2. **Declined Payment:** Verify error handling
3. **Timeout:** Check webhook retry logic
4. **Network Error:** Verify graceful degradation

## Troubleshooting

### Common Issues

#### "Invalid phone number" Error
**Solution:** Verify format is `263XXXXXXXXX` (11-12 digits total)
**Example:** `263771234567` for Econet line

#### Payment redirects to error page
**Possible Causes:**
1. Invalid Integration ID
2. Integration Key mismatch
3. Return URL not registered in Paynow dashboard
4. Result URL unreachable

**Solution:** Contact Paynow support with Integration ID `23069`

#### Webhook not received
**Check:**
1. Result URL is publicly accessible
2. Firewall allows Paynow IP ranges
3. Review `/api/payments/paynow/webhook` logs
4. Check database for pending transactions

#### Subscription not activated after payment
**Verify:**
1. Webhook was received (check logs)
2. Payment amount matches plan pricing
3. Database connection working
4. User permissions allow subscription update

## Monitoring & Logs

### Log Locations
- **Application Logs:** PM2 logs in `/root/.pm2/logs/`
- **Webhook Logs:** Search for `[Paynow]` in application logs
- **Payment Logs:** Search for `Payment processed` in logs

### Monitoring Commands
```bash
# Check PM2 status
pm2 status

# View real-time logs
pm2 logs ticktrack-pro

# Search Paynow logs
pm2 logs ticktrack-pro | grep "Paynow"
```

## Deployment Notes

### Version Information
- **Deployment Date:** January 14, 2026
- **Build:** Next.js 14.2.33
- **Server:** Linux (Ubuntu) with PM2
- **Database:** PostgreSQL (ticktrack_prod)

### Files Modified
- `app/billing/page.tsx` - Updated UI with phone input
- `.env` - Added Paynow credentials
- GitHub commit: `bf0a277`

### Rollback Plan (if needed)
1. Revert `.env` file changes
2. Revert `app/billing/page.tsx` to previous version
3. Rebuild and restart PM2
4. Paynow payments will be disabled

## Next Steps

### Optional Enhancements
1. **Email Confirmation:** Send payment receipt after success
2. **SMS Confirmation:** Notify user via SMS about activation
3. **Invoice Generation:** Create PDF invoice for audit
4. **Payment Retry:** Automatic retry for failed payments
5. **Multi-currency:** Support for more currencies
6. **Subscription Management:** Allow plan changes/cancellations

### Monitoring Tasks
1. Review payment metrics weekly
2. Monitor webhook success rate
3. Check for failed transactions
4. Validate subscription activations

## Support Contact

**Paynow Support:**
- **Integration ID:** 23069
- **Contact:** Through Paynow dashboard
- **Documentation:** https://www.paynow.co.zw/api

**TickTrack Pro Support:**
- **Email:** support@ticktrackpro.com
- **Issues:** Track in GitHub issues

## References

### Related Files
- [Paynow Service](lib/paynow-service.ts)
- [Billing Endpoints](app/api/billing/paynow/)
- [Billing Page](app/billing/page.tsx)
- [Environment Template](.env.example)

### Paynow Resources
- Official Site: https://www.paynow.co.zw
- Developer Dashboard: https://developer.paynow.co.zw
- API Documentation: https://docs.paynow.co.zw

---

**Status:** ✅ Production Live
**Last Updated:** January 14, 2026
**Activation Type:** 3rd Party Integration (UNASH HOPE DESIGNS)
