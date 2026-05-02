# Payment System Quick Reference

## Executive Summary

**Your PurpleMerit Links platform has 3 revenue streams:**

### 1. 💳 Plan Subscriptions
- **Admin earns:** 100% of subscription fees
- **Example:** ₹499 × 100 members = ₹49,900/month
- **Status:** Data models ready, Razorpay integration needed

### 2. 📊 Ad CPM Monetization  
- **Admin earns:** 20% margin on every qualified click
- **Members earn:** 80% of CPM value
- **Example:** ₹2.5 CPM × 1000 clicks = ₹2.50 member earnings, ₹0.50 admin
- **Status:** Core logic ready, needs standardization

### 3. 🤝 Referral Commission
- **Referrer earns:** 15% of referred member's earnings
- **Admin earns:** 20% margin (same as always)
- **Example:** Member B earns ₹2, referrer A gets ₹0.30
- **Status:** Data structure ready, earning logic pending

---

## How Admin Earns - Three Ways

### Revenue Stream 1: Plan Subscriptions

```
₹499/month × 100 members = ₹49,900 (100% to admin)
₹999/month × 50 members  = ₹49,950 (100% to admin)
₹2499/month × 10 members = ₹24,990 (100% to admin)
                          ──────────────
                   Total = ₹124,840/month ✅
```

**Implementation needed:**
1. Razorpay payment gateway integration
2. Create POST `/api/v1/payments/razorpay/create-order`
3. Create POST `/api/v1/payments/razorpay/verify`
4. Handle webhook from Razorpay

---

### Revenue Stream 2: CPM Margin (20%)

```
When visitor completes 5-step funnel on member's link:

1. Click logged from India
2. Funnel qualified (all 5 steps done)
3. Lookup CPM rate for India = ₹2.5

Payout per click = ₹2.5 / 1000 = ₹0.0025

Split:
  Member (80%) = ₹0.002 ← credited to wallet
  Admin (20%) = ₹0.0005 ← tracked in revenue log

Over 1000 clicks:
  Member earns: ₹2.00
  Admin earns: ₹0.50 ✅
```

**Current status:**
- ✅ CPM rates system (by country)
- ✅ Wallet credit logic
- ⚠️ **ISSUE:** Two conflicting systems (fixed ₹0.50 vs variable CPM)
- 🔧 **Fix needed:** Standardize to use country-based CPM everywhere

---

### Revenue Stream 3: Referral Commission

```
Member A refers Member B using code "ABC123"

When Member B's link gets qualified clicks:

Total CPM earned by B: ₹2.50
├─ Admin (20%): ₹0.50 (always)
├─ Member B (80%): ₹2.00
│  └─ Referrer A gets: ₹2.00 × 15% = ₹0.30 ✅
│
└─ Member B actually receives: ₹2.00 - ₹0.30 = ₹1.70

All three parties benefit from one click!
```

**Current status:**
- ✅ Referral tracking structure
- ✅ Data models for referral profiles
- ❌ **Missing:** Earning credit logic
- 🔧 **Fix needed:** Implement referral earning credits in PayoutAutomationService

---

## Current Implementation Status

### ✅ Fully Implemented
- [x] Wallet & WalletLedger system
- [x] Plan subscription models
- [x] CPM rates system (by country)
- [x] Withdrawal request & approval flow
- [x] Member metrics tracking
- [x] Invoice models
- [x] Member balance calculation (80% of CPM)
- [x] Admin 20% margin calculation (in code)

### ⚠️ Issues Needing Fixes
1. **CPM Conflict** - Two payout systems in codebase
   - `constants.ts`: Fixed ₹0.50 per click
   - `payout-automation.service.ts`: Variable CPM per country
   - **Action:** Standardize to country-based CPM

2. **Payment Integration Missing** - Razorpay not connected
   - **Action:** Implement payment gateway endpoints

3. **Referral Earning Logic Missing** - Referrer not credited
   - **Action:** Add earning credits when referred member gets qualified clicks

4. **Admin Earnings Dashboard Missing** - No earnings visibility
   - **Action:** Create `/admin/earnings` page

### 🔄 Work In Progress
- Subscription payment endpoints
- Referral commission implementation
- Admin earnings dashboard

---

## Data Model Relationships

```
USER
├─ subscriptions → PLAN (via planId)
│  └─ expiresAt, invoiceId
├─ wallet → WALLET (one-to-one)
│  └─ balance, pendingAmount
├─ shortUrls → SHORT_URL (one-to-many)
│  └─ owned links
├─ referrals → REFERRAL (one-to-one)
│  └─ referral code, earned amounts
└─ withdrawals → WITHDRAWAL (one-to-many)
   └─ payout requests

WALLET
└─ ledgerEntries → WALLET_LEDGER (one-to-many)
   ├─ type: CREDIT/DEBIT
   ├─ source: EARNING/WITHDRAWAL/REFERRAL_EARNING/etc
   └─ amount, reference, timestamp

SHORT_URL
├─ clicks → CLICK_LOG (one-to-many)
│  ├─ country, jsEnabled, isQualified
│  └─ timestamp
└─ redirectSessions → REDIRECT_SESSION (one-to-many)
   ├─ funnel steps [1,2,3,4,5]
   ├─ isQualified: boolean
   └─ country, earning calculated

CPM_RATE (Lookup table)
├─ countryCode (unique)
├─ cpm (₹2.5, $15, etc)
└─ currency, notes

INVOICE
├─ type: SUBSCRIPTION/TOPUP/etc
├─ status: PENDING/PAID/FAILED
├─ providerOrderId: Razorpay order ID
└─ paidAt: timestamp

REVENUE_LOG (Admin tracking - NEW)
├─ source: SUBSCRIPTION/CPM/REFERRAL
├─ amount: admin's cut
├─ country: for CPM analytics
└─ createdAt: for dashboard
```

---

## Earning Calculation Examples

### Example 1: Simple Direct Click (No Referral)

```
Scenario: Visitor from India clicks Member's link

1. Click logged
   ├─ Country: India
   ├─ ipHash: xxxxx
   └─ timestamp: 2026-05-01 10:30

2. Funnel completed (5 steps)
   └─ isQualified: true

3. CPM lookup for India
   └─ CPM: ₹2.5

4. Calculate earnings
   ├─ Total per click: ₹2.5 / 1000 = ₹0.0025
   ├─ Member earns: ₹0.0025 × 0.80 = ₹0.002
   └─ Admin earns: ₹0.0025 × 0.20 = ₹0.0005

5. Update wallets
   ├─ Member wallet: +₹0.002
   ├─ WalletLedger: EARNING, +₹0.002
   ├─ MemberMetrics: +1 click, +₹0.002
   ├─ RevenueLog (admin): CPM, +₹0.0005
   └─ AdminReport: revenue updated

Over 1000 clicks from India:
├─ Member: ₹2.00 ✅
└─ Admin: ₹0.50 ✅
```

### Example 2: Referred Member Click

```
Scenario: Member A referred Member B
          Visitor from USA clicks B's link

1. CPM lookup for USA
   └─ CPM: $15 (≈ ₹1,260 in INR)

2. Calculate base earnings
   ├─ Total per click: $15 / 1000 = $0.015
   ├─ Member B (direct) gets 80%: $0.012
   ├─ Admin gets 20%: $0.003
   └─ Referrer A commission 15% of B: $0.012 × 0.15 = $0.0018

3. Update wallets
   ├─ Member B: +$0.012 - $0.0018 = +$0.0102
   ├─ Member A: +$0.0018
   ├─ Admin: +$0.003
   └─ Both get WalletLedger + MemberMetrics updates

Over 1000 USA clicks with referral:
├─ Member B: $12.00 - $1.80 = $10.20
├─ Member A: $1.80
└─ Admin: $3.00
   Total: $15.00 ✅
```

### Example 3: Multi-Country Member (30 days)

```
Member's dashboard shows:

EARNINGS BREAKDOWN (This Month):
├─ India (₹2.5 CPM)
│  ├─ Clicks: 1000
│  └─ Earnings: ₹2.00
├─ USA ($15 CPM)
│  ├─ Clicks: 100
│  └─ Earnings: $1.50 (≈ ₹126)
├─ UK (₹12.5 CPM)
│  ├─ Clicks: 250
│  └─ Earnings: ₹3.13
└─ TOTAL EARNINGS: ₹131.13

WITHDRAWAL WORKFLOW:
1. Request withdrawal: ₹100
2. Status: PENDING (under admin review)
   ├─ Available balance: ₹31.13
   └─ Pending amount: ₹100 (reserved but still "yours")

3. Admin approves
   ├─ Status: APPROVED
   ├─ Available balance: ₹31.13 (unchanged, only ₹100 reserved)
   └─ Pending: ₹100 (will be deducted now)

4. Admin pays member
   ├─ Status: PAID
   ├─ Bank account +₹100
   ├─ System balance: ₹31.13 (deducted)
   └─ Ready for next cycle
```

---

## Critical Issues & Quick Fixes

### Issue 1: CPM Conflict

**Problem:**
```
redirect.service.ts uses:    PAYOUT_PER_QUALIFIED_CLICK = ₹0.50 (fixed)
payout-automation.service uses: CPM / 1000 (variable by country)
```

**Fix:**
Create `utils/cpm-calculation.ts`:
```typescript
export function calculateCpmBreakdown(cpmRate: number, currency: string) {
  const totalPerClick = cpmRate / 1000;
  return {
    memberEarning: totalPerClick * 0.80,
    adminEarning: totalPerClick * 0.20
  };
}
```

Use everywhere instead of `PAYOUT_PER_QUALIFIED_CLICK`.

---

### Issue 2: No Payment Integration

**Problem:** Razorpay endpoints not implemented

**Quick fix needed:**
```typescript
POST /api/v1/payments/razorpay/create-order
  Body: { planId, userId }
  Response: { orderId, amount, currency, keyId }

POST /api/v1/payments/razorpay/verify
  Body: { paymentId, orderId, signature }
  Response: { invoiceId, message }
```

**Timeline:** ~2-3 hours to implement

---

### Issue 3: No Referral Earnings

**Problem:** Referrer wallet never credited

**Quick fix:** In `PayoutAutomationService.processSessionPayout()`, after crediting member:
```typescript
// Check for referrer
const referralProfile = await referralRepository.getByOwnerId(memberId);
if (referralProfile) {
  const referralAmount = breakdown.memberEarning * 0.15;
  await walletService.credit(referralProfile.ownerId, referralAmount, ...);
}
```

**Timeline:** ~30 minutes

---

### Issue 4: No Admin Earnings Dashboard

**Problem:** Admin can't see earnings breakdown

**Quick fix needed:**
```typescript
GET /api/v1/admin/earnings?since=DATE&until=DATE
Response: {
  totalEarnings: 124840.50,
  byCpmClicks: 2340.50,
  bySubscriptions: 124840,
  byReferrals: 0,
  byCountry: [
    { country: "IN", amount: 1200 },
    { country: "US", amount: 800 }
  ],
  byDate: [
    { date: "2026-05-01", amount: 4250 }
  ]
}
```

**Timeline:** ~1.5 hours

---

## Next Steps - Priority Order

### 🔴 Critical (Do First)
1. **Fix CPM Conflict** - Standardize calculation logic
   - Create `cpm-calculation.ts` utility
   - Update both service files
   - Test with seed data
   - **Time:** 1 hour

2. **Implement Razorpay Integration** - Unlock subscriptions
   - Create payment service & routes
   - Create controller
   - Test payment flow
   - **Time:** 2-3 hours

### 🟡 Important (Do Second)
3. **Implement Referral Earnings** - Complete revenue model
   - Add referral earning credits
   - Test referral flow
   - **Time:** 30 minutes

4. **Create Admin Earnings Dashboard** - Visibility
   - Create endpoint
   - Create frontend page
   - Add charts
   - **Time:** 1.5 hours

### 🟢 Nice-to-Have (Do Last)
5. Create Revenue Log model for detailed tracking
6. Add earnings charts/analytics
7. Implement subscription auto-renewal
8. Add tax calculation by region

---

## Testing Checklist

### Subscription Payment Flow
- [ ] Create Razorpay order
- [ ] Complete payment in test mode
- [ ] Verify signature
- [ ] Invoice created with status PAID
- [ ] User subscription updated
- [ ] Plan limits enforced

### CPM Monetization Flow
- [ ] Click logged with country
- [ ] Funnel completed, marked qualified
- [ ] CPM rate fetched for country
- [ ] Earnings calculated correctly (80/20 split)
- [ ] Member wallet credited
- [ ] MemberMetrics updated
- [ ] Earnings visible in dashboard

### Referral Flow
- [ ] Referred member signs up with code
- [ ] Referrer profile linked
- [ ] Qualified click on referred member's link
- [ ] Both wallets credited correctly
- [ ] Breakdown visible in earnings

### Withdrawal Flow
- [ ] Member requests withdrawal
- [ ] Balance reserved (moveToPending)
- [ ] Admin approves (releasePending)
- [ ] Balance actually deducted
- [ ] Admin processes payment
- [ ] Status: PAID

---

## File References

**Payment Implementation:**
- `apps/api/src/config/constants.ts` - Earning rates
- `apps/api/src/models/cpm-rate.model.ts` - CPM storage
- `apps/api/src/models/invoice.model.ts` - Payment tracking
- `apps/api/src/models/plan.model.ts` - Subscription plans
- `apps/api/src/modules/wallet/wallet.service.ts` - Balance management
- `apps/api/src/modules/redirect/payout-automation.service.ts` - Earning calculation
- `apps/api/src/modules/redirect/redirect.service.ts` - Direct earning credit

**Frontend:**
- `apps/web/src/app/dashboard/wallet/page.tsx` - Member wallet view
- `apps/web/src/app/dashboard/partner/earnings/page.tsx` - Earnings breakdown
- `apps/web/src/app/admin/cpm-rates/page.tsx` - CPM rate management
- `apps/web/src/app/admin/withdrawals/page.tsx` - Withdrawal approval

---

## Documentation Files Created

1. **PAYMENT_FLOW_EXPLANATION.md** - Complete system overview
2. **PAYMENT_IMPLEMENTATION_GUIDE.md** - Code fixes with examples
3. **PAYMENT_VISUAL_FLOWS.md** - Diagrams and flowcharts
4. **PAYMENT_QUICK_REFERENCE.md** - This file (summary)

