# Payment Flow & Revenue Model Explanation
**PurpleMerit Links - Complete Financial System**

---

## 1. REVENUE STREAMS OVERVIEW

The platform generates revenue through three primary mechanisms:

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE STREAMS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. PLAN SUBSCRIPTIONS (B2B2C Model)                         │
│    └─ Admin keeps 100% of subscription fees                │
│                                                             │
│ 2. AD MONETIZATION (CPM - Cost Per Mille)                   │
│    └─ Admin keeps 20% platform margin                      │
│    └─ Members earn 80% of CPM value per qualified click    │
│                                                             │
│ 3. REFERRAL COMMISSION (Future - In system structure)      │
│    └─ Referred member's earnings can be partially cut      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. DETAILED PAYMENT FLOWS

### A. SUBSCRIPTION PAYMENT FLOW

**When:** Member upgrades from Free → Starter, Pro, or Business plan

**Participants:**
- Member (Payer)
- Admin (Platform) (Receiver)
- Payment Gateway (Razorpay) (Processor)

**Flow Diagram:**
```
MEMBER                    PLATFORM                 RAZORPAY
  │                           │                        │
  ├──────────── Choose Plan ──────────────────────────►│
  │                           │                        │
  │◄────── Show Payment Form ─────────────────────────┤
  │                           │                        │
  ├──────── Submit Payment ───────────────────────────►│
  │                           │                        │
  │◄─── Razorpay Webhook ─────────────────────────────│
  │                    (Payment Verified)              │
  │                           │                        │
  │                 ┌─────────▼──────────┐             │
  │                 │ Create Invoice     │             │
  │                 │ Status: PAID       │             │
  │                 │ Type: SUBSCRIPTION │             │
  │                 └─────────┬──────────┘             │
  │                           │                        │
  │                 ┌─────────▼──────────┐             │
  │                 │ Update User Plan   │             │
  │                 │ Set expiry to      │             │
  │                 │ 30 days from now   │             │
  │                 └───────────────────┘             │
  │                                                    │
  │◄─────── Payment Confirmation ─────────────────────┤
  │
```

**Data Models Updated:**
- `Invoice` → Type: SUBSCRIPTION, Status: PAID, amount: ₹plan.price
- `User.subscription` → planId, expiresAt (30 days from payment)
- `User.status` → May change from "free" to "premium"

**Admin Earnings:**
- ₹499 (Starter) = 100% to Admin per member
- ₹999 (Pro) = 100% to Admin per member
- ₹2499 (Business) = 100% to Admin per member
- **No margin split** — Admin keeps full amount

---

### B. AD MONETIZATION FLOW (CPM - Cost Per Mille)

**When:** A member's shortened link is visited and user completes the monetization funnel

**CPM Definition:**
- **CPM** = Cost Per Mille = Cost per 1000 impressions
- Example: CPM of $2.5 = You earn $2.50 for every 1000 visitor interactions

**Current System Setup:**
```
PAYOUT_PER_QUALIFIED_CLICK = ₹0.50
PLATFORM_MARGIN_PERCENT = 0.2 (20%)
```

**But CPM is more sophisticated — it varies by country/region:**

**Participants:**
- Visitor (Clicks link)
- Member (Link owner / Content creator)
- Admin (Platform)
- Ad Network / Advertiser (Pays CPM)

**Detailed CPM Flow:**

```
VISITOR                 MEMBER'S LINK              PLATFORM               AD NETWORK
  │                           │                         │                     │
  ├──────────────────── Click shortened URL ──────────────────────────────►│
  │                           │                         │                     │
  │                    ┌──────▼─────────┐              │                     │
  │                    │ Count as Click  │              │                     │
  │                    │ Log details:    │              │                     │
  │                    │ - IP address    │              │                     │
  │                    │ - Browser       │              │                     │
  │                    │ - Country       │              │                     │
  │                    │ - Device type   │              │                     │
  │                    └──────┬─────────┘              │                     │
  │                           │                         │                     │
  │◄────── Redirect to Funnel (Blog Page) ──────────────┤                     │
  │                                                     │                     │
  │    [5-STEP MONETIZATION FUNNEL]                    │                     │
  │    Step 1: Landing (10s min) ────┐                 │                     │
  │    Step 2: Scroll Detection ──────┤ Validates      │                     │
  │    Step 3: CTA Click ─────────────┤ Engagement     │                     │
  │    Step 4: Blog reading (10s) ────┤ Metrics        │                     │
  │    Step 5: Final interaction ─────┘                │                     │
  │                                                     │                     │
  │                              ┌──────────────────────▼──────┐             │
  │                              │ Check if QUALIFIED          │             │
  │                              │ (All 5 steps completed)     │             │
  │                              │ - JS enabled               │             │
  │                              │ - Not a bot                │             │
  │                              │ - Not suspicious traffic    │             │
  │                              └──────────┬─────────────────┘             │
  │                                         │                                 │
  │                         ┌───────────────▼────────────────┐               │
  │                         │ Lookup CPM Rate for Country   │               │
  │                         │ (From cpmRateRepository)       │               │
  │                         │ E.g., India = ₹2.5 CPM       │               │
  │                         └───────────────┬────────────────┘               │
  │                                         │                                 │
  │                         ┌───────────────▼────────────────────────────┐  │
  │                         │ CALCULATE PAYOUT                            │  │
  │                         │ Amount = CPM / 1000                         │  │
  │                         │ India: ₹2.5 / 1000 = ₹0.0025 per click    │  │
  │                         │                                             │  │
  │                         │ But wait... we have two systems:            │  │
  │                         │                                             │  │
  │                         │ SYSTEM 1: PAYOUT_PER_QUALIFIED_CLICK        │  │
  │                         │ └─ Fixed: ₹0.50 per click                  │  │
  │                         │                                             │  │
  │                         │ SYSTEM 2: COUNTRY-BASED CPM                │  │
  │                         │ └─ Variable by location                    │  │
  │                         │ └─ More accurate for monetization          │  │
  │                         │                                             │  │
  │                         │ ⚠️  CONFLICT: Need unified approach        │  │
  │                         └─────────────────┬──────────────────────────┘  │
  │                                           │                              │
  │                           ┌───────────────▼────────────────────┐         │
  │                           │ APPLY PLATFORM MARGIN (20%)        │         │
  │                           │                                    │         │
  │                           │ Total CPM from Ad Network: ₹2.5   │         │
  │                           │                                    │         │
  │                           │ Split:                             │         │
  │                           │ Admin (20%) = ₹2.5 × 0.20 = ₹0.50│         │
  │                           │ Member (80%) = ₹2.5 × 0.80 = ₹2.00│        │
  │                           │                                    │         │
  │                           │ Actual per click:                  │         │
  │                           │ Admin = ₹0.50 / 1000 = ₹0.0005   │         │
  │                           │ Member = ₹2.00 / 1000 = ₹0.002   │         │
  │                           └────────┬──────────────────────────┘         │
  │                                    │                                     │
  │                    ┌───────────────▼────────────────┐                   │
  │                    │ Credit Member Wallet            │                   │
  │                    │ Type: EARNING                   │                   │
  │                    │ Source: EARNING (CPM)           │                   │
  │                    │ Amount: ₹0.002 (or ₹0.50 fixed)│                   │
  │                    │                                 │                   │
  │                    │ Create WalletLedger entry       │                   │
  │                    └────────────┬────────────────────┘                   │
  │                                 │                                        │
  │                    ┌────────────▼──────────────────┐                    │
  │                    │ Update MemberMetrics           │                    │
  │                    │ - Increment totalQualifiedClicks│                   │
  │                    │ - Increment totalEarnings      │                    │
  │                    │ - Increment thisMonthEarnings  │                    │
  │                    └────────────┬──────────────────┘                    │
  │                                 │                                        │
  │                    ┌────────────▼──────────────────┐                    │
  │                    │ Create RedirectSession         │                    │
  │                    │ isQualified: true              │                    │
  │                    │ Save step timings              │                    │
  │                    └────────────────────────────────┘                    │
  │                                                                          │
  │◄──────────────── Display Thank You / Redirect ──────────────────────────┤
  │
```

**CPM Rate Management:**
Admin sets CPM rates per country in `/admin/cpm-rates`:
```
Country Code | CPM    | Currency | Notes
─────────────┼────────┼──────────┼──────────────────────
IN           | 2.5    | USD      | India rate
US           | 15.0   | USD      | United States rate
GB           | 12.5   | USD      | United Kingdom rate
DE           | 10.0   | USD      | Germany rate
```

**Example Calculation (Member earning):**
- Visitor from India completes funnel
- CPM Rate for India = ₹2.5
- Member earns = ₹2.5 / 1000 = ₹0.0025 per qualified click
- Over 1000 qualified clicks = ₹2.50 earnings

**Admin portion (20% margin on CPM):**
- Admin earns = ₹2.5 × 0.20 / 1000 = ₹0.0005 per click
- Over 1000 clicks = ₹0.50 to admin

---

### C. REFERRAL COMMISSION FLOW (Setup Ready, Implementation Pending)

**When:** Member A refers Member B, and Member B's link gets qualified clicks

**Current Setup:**
- `Referral` model with `ownerId`, `code`, `totalReferred`, `totalEarnings`
- `AnonymousSession` can track referral code in cookie
- `AnonymousSession` model has `referralCode` field
- When anonymous session completes, referral code holder gets commission

**Proposed Flow:**
```
MEMBER A (Referrer)
  │
  ├─ Creates referral code: "EF3GCWHR"
  │
  ├─ Shares code with others
  │
  └─ Member B signs up with code "EF3GCWHR"
      │
      ├─ Member B creates links
      │
      ├─ Visitor completes funnel on B's link
      │
      ├─ Qualified click triggers:
      │  ├─ Member B earns: 80% of CPM
      │  ├─ Admin earns: 20% of CPM
      │  └─ Member A earns: ? % of B's CPM (CONFIGURABLE)
      │     └─ Typical: 10-20% of Member B's earnings
      │
      └─ All three wallets credited
```

**Referral Earning Calculation Example:**
- Member B's CPM earning: ₹2.00 (80% of ₹2.50)
- Referral Commission Rate: 15% (Admin configured)
- Member A earns: ₹2.00 × 0.15 = ₹0.30

**Note:** Referral commission system structure exists but earning logic needs implementation.

---

## 3. HOW ADMIN EARNS - COMPLETE BREAKDOWN

### Revenue Source 1: Plan Subscriptions ✅ (Implemented)
```
Starter Plan:  ₹499/month  × Members → Admin Revenue
Pro Plan:      ₹999/month  × Members → Admin Revenue
Business Plan: ₹2499/month × Members → Admin Revenue

Total = Sum of all active premium subscriptions
```

**Example:**
- 100 Starter members × ₹499 = ₹49,900/month
- 50 Pro members × ₹999 = ₹49,950/month
- 10 Business members × ₹2499 = ₹24,990/month
- **Total Admin Revenue: ₹124,840/month**

**Implementation Status:** Razorpay payment endpoint needed

---

### Revenue Source 2: Platform CPM Margin ✅ (Core logic ready)
```
Member Click Earning = CPM / 1000
Platform (Admin) Margin = (CPM / 1000) × 0.20

Total CPM Payout = CPM / 1000
├─ Member Share (80%): (CPM / 1000) × 0.80
└─ Admin Share (20%): (CPM / 1000) × 0.20
```

**Example with ₹2.5 CPM (India):**
```
1 Qualified Click:
├─ Member earns: ₹2.5 / 1000 × 0.80 = ₹0.002
└─ Admin earns:  ₹2.5 / 1000 × 0.20 = ₹0.0005

1,000 Qualified Clicks:
├─ Member earns: ₹2.00
└─ Admin earns:  ₹0.50

10,000 Qualified Clicks:
├─ Member earns: ₹20.00
└─ Admin earns:  ₹5.00
```

**Current Implementation:** In `payout-automation.service.ts` and `redirect.service.ts`

---

### Revenue Source 3: Referral Commission (Structure ready, logic pending)
```
When Member A refers Member B:
├─ Member A gets X% of Member B's CPM earnings
├─ Member B keeps remaining % of CPM earnings
└─ Admin keeps 20% margin as always

Configurable Commission Rate: 10-25% (Admin sets)
```

**Example with 15% referral rate:**
```
Member B qualified click (₹2.5 CPM):
├─ Member B earns: ₹2.00 (80% of total)
├─ Member A earns: ₹2.00 × 0.15 = ₹0.30
├─ Remaining B: ₹2.00 - ₹0.30 = ₹1.70
└─ Admin earns: ₹0.50 (20% as always)
```

**Note:** This requires implementing referral earning logic in PayoutAutomationService

---

## 4. PAYMENT TRACKING & REPORTING

### Admin Dashboard Metrics
```
/admin/reports endpoint shows:
├─ Revenue
│  ├─ Gross Collected (Total plan subscriptions + CPM earnings)
│  └─ By Period (Daily, Weekly, Monthly)
├─ Users
│  ├─ Total
│  ├─ Active
│  └─ Banned
├─ URLs
│  ├─ Total Created
│  ├─ Active
│  ├─ Paused
│  └─ Deleted
└─ Clicks
   ├─ Total
   └─ Unique
```

### Member Dashboard Metrics
```
/dashboard/partner/earnings shows:
├─ Total Earnings (All time)
├─ This Month Earnings
├─ Total Qualified Clicks
└─ Breakdown by Country
   ├─ Clicks from each country
   └─ Earnings per country
```

---

## 5. DATA MODELS INTERACTION

```
SUBSCRIPTION FLOW:
User → Invoice → Subscription Status

CPM MONETIZATION FLOW:
Visitor → ClickLog (Country info)
       → RedirectSession (Funnel progress)
       → CpmRate (Country lookup)
       → Wallet (Credit payout)
       → WalletLedger (Transaction record)
       → MemberMetrics (Earnings tracking)

WITHDRAWAL FLOW (Member → Admin):
Member → WithdrawalRequest (PENDING)
      → WalletLedger (moveToPending)
      → [Admin Review]
      → WithdrawalRequest (APPROVED)
      → WalletLedger (releasePending - deduct from available)
      → WithdrawalRequest (PAID)
      → Money transferred to member account
```

---

## 6. ISSUES & REQUIRED FIXES

### Issue 1: CPM Calculation Conflict ⚠️
**Current Problem:**
- `constants.ts` defines: `PAYOUT_PER_QUALIFIED_CLICK = 0.5` (fixed ₹0.50)
- `payout-automation.service.ts` uses: `CPM / 1000` (variable by country)
- `redirect.service.ts` uses: `PAYOUT_PER_QUALIFIED_CLICK` (fixed)

**Which system is correct?**
- Fixed ₹0.50: Simple but unfair (high-CPM countries earn same as low-CPM)
- Variable CPM: Complex but fair and globally competitive

**Recommendation:** Use **country-based CPM rates** as primary system. `PAYOUT_PER_QUALIFIED_CLICK` can be fallback.

**Fix Needed:** Standardize to use CPM rates everywhere.

---

### Issue 2: Subscription Payment Not Integrated ⚠️
**Status:** Payment form exists but Razorpay endpoints not fully connected

**Need to implement:**
```typescript
POST /api/v1/payments/razorpay/create-order
  ├─ Accept: planId, userId
  ├─ Create Razorpay order
  └─ Return: orderId, amount, currency

POST /api/v1/payments/razorpay/verify
  ├─ Accept: paymentId, orderId, signature
  ├─ Verify with Razorpay
  ├─ Create Invoice (PAID)
  └─ Update User subscription
```

---

### Issue 3: Referral Commission Logic Missing ⚠️
**Status:** Data models exist but earning credits not implemented

**Need to implement:**
- When qualified click happens to referred member's link
- Check if referrer exists
- Calculate referral commission
- Credit both member and referrer wallets
- Update both member metrics

---

### Issue 4: Admin Earning Visibility ⚠️
**Status:** No dedicated admin earnings dashboard

**Need to implement:**
```
/admin/earnings page showing:
├─ Subscription Revenue (₹X from Y members)
├─ CPM Revenue (₹X from Y qualified clicks)
├─ Referral Commission (₹X from Z referrals)
├─ Daily/Weekly/Monthly breakdown
└─ Charts and trends
```

---

## 7. COMPLETE EXAMPLE: ONE QUALIFIED CLICK JOURNEY

**Scenario:** 
- Member A with 5 referred members (using referral code "ABC123")
- Visitor from India clicks Member B's link (referred via code)
- Visitor completes 5-step funnel
- CPM rate for India = ₹2.5

**Execution:**

```
1. CLICK LOGGED
   ClickLog created:
   ├─ shortCode: "abc123"
   ├─ ownerId: Member B
   ├─ country: "IN"
   ├─ isQualified: false (yet)

2. FUNNEL COMPLETED
   RedirectSession updated:
   ├─ isQualified: true
   ├─ completedSteps: [1,2,3,4,5]
   ├─ totalTime: 35 seconds

3. CPM CALCULATION
   CpmRate lookup:
   ├─ Country: "IN"
   ├─ CPM: ₹2.5
   ├─ Currency: "USD" (or INR based on config)

4. PAYOUT CALCULATION
   ├─ Total payout: ₹2.5 / 1000 = ₹0.0025
   ├─ Member B (80%): ₹0.002
   ├─ Member A (15% of B): ₹0.002 × 0.15 = ₹0.0003
   └─ Admin (20%): ₹0.0005

5. WALLET CREDITS
   Member B Wallet:
   ├─ +₹0.002
   ├─ LedgerEntry: Type=CREDIT, Source=EARNING
   └─ MemberMetrics: +1 qualified click, +₹0.002 earnings

   Member A Wallet (if referrer):
   ├─ +₹0.0003
   ├─ LedgerEntry: Type=CREDIT, Source=REFERRAL_EARNING
   └─ MemberMetrics: +₹0.0003 earnings

   Admin Account (implicit):
   ├─ +₹0.0005
   ├─ Recorded in RevenueLog/ReportMetrics
   └─ Available for admin withdrawal or reinvestment

6. METRICS UPDATED
   Member B:
   ├─ totalQualifiedClicks: +1
   ├─ totalEarnings: +₹0.002
   ├─ thisMonthEarnings: +₹0.002

   Member A:
   ├─ totalEarnings: +₹0.0003
   ├─ thisMonthEarnings: +₹0.0003

   Admin:
   └─ Revenue: +₹0.0005
```

**Over 1000 qualified clicks:**
```
Member B:     ₹2.00
Member A:     ₹0.30
Admin:        ₹0.50
Total CPM out: ₹2.50 ✅
```

---

## 8. WORKFLOW SUMMARY FOR IMPLEMENTATION

### ✅ Completed
- [x] Database models for all payment types
- [x] CPM rates system (country-based)
- [x] Wallet & WalletLedger for tracking
- [x] Plan subscription models
- [x] Invoice system for payments
- [x] Referral tracking structure
- [x] Member metrics and earnings tracking
- [x] Withdrawal request & approval flow
- [x] payout-automation.service basic structure

### ⚠️ In Progress / Needs Fixing
- [ ] **Standardize CPM calculation** (fixed vs variable)
- [ ] **Implement Razorpay payment endpoints**
- [ ] **Implement referral earning credits**
- [ ] **Build admin earnings dashboard**
- [ ] **Reconciliation & accounting reports**
- [ ] **Test complete payment flow end-to-end**

### 📋 Future Enhancements
- [ ] Multiple payment gateways (Stripe, PayPal)
- [ ] Subscription auto-renewal
- [ ] Tax calculation by region
- [ ] Dunning management (retry failed payments)
- [ ] Chargeback dispute handling
- [ ] Affiliate marketplace integration
- [ ] Commission tiers (increase referral % with volume)

---

## 9. QUICK REFERENCE: WHO EARNS WHAT

| Payment Type | Member Earns | Admin Earns | Triggered By |
|---|---|---|---|
| **Subscription** | Access to features | 100% of fee | Member upgrades plan |
| **CPM (Direct)** | 80% of CPM/1000 | 20% margin | Qualified link clicks |
| **CPM (Referral)** | Variable* (85% of their CPM) | 20% margin | Referred member's clicks |
| **Referral Commission** | 15%* of referred member's earnings | Implied in margins | Referred member activity |

*Configurable by admin

