# Payment System Visual Diagrams

## 1. THREE REVENUE SOURCES - SIDE BY SIDE COMPARISON

### Revenue Source 1: Plan Subscriptions

```
┌─────────────────────────────────────────────────────────────┐
│           PLAN SUBSCRIPTION FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MEMBER                    RAZORPAY                 ADMIN   │
│    │                           │                      │    │
│    ├── Click "Upgrade Plan" ──►│                      │    │
│    │                           │                      │    │
│    │◄─── Show Payment Form ────│                      │    │
│    │                           │                      │    │
│    ├── Submit Payment ────────►│                      │    │
│    │                           │                      │    │
│    │                    [Process & Verify]            │    │
│    │                           │                      │    │
│    │                    Webhook Success ─────────────►│    │
│    │                           │                  [Create   │
│    │                           │                   Invoice] │
│    │                           │                      │    │
│    │                    ┌──────▼───────┐            │    │
│    │                    │ Credit Admin  │            │    │
│    │                    │ 100% of ₹499 │            │    │
│    │                    │  OR ₹999     │            │    │
│    │                    │  OR ₹2499    │            │    │
│    │                    └──────────────┘            │    │
│    │                           │                      │    │
│    ◄────────── Confirmation ────────────────────────►│    │
│                                                       │    │
└─────────────────────────────────────────────────────────────┘

EARNINGS:
├─ Member: Access to premium features
└─ Admin: 100% of ₹499/999/2499 = ₹124,840+/month for 100 members
```

### Revenue Source 2: Ad Monetization (CPM)

```
┌─────────────────────────────────────────────────────────────┐
│        CPM AD MONETIZATION FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VISITOR        FUNNEL      MEMBER WALLET      ADMIN        │
│    │              │              │              │          │
│    ├─ Click ─────►│              │              │          │
│    │              │              │              │          │
│    │    ┌─────────▼──────────┐   │              │          │
│    │    │ 5-Step Funnel      │   │              │          │
│    │    │ ├─ Landing (10s)   │   │              │          │
│    │    │ ├─ Scroll detect   │   │              │          │
│    │    │ ├─ CTA click       │   │              │          │
│    │    │ ├─ Read blog (10s) │   │              │          │
│    │    │ └─ Final action    │   │              │          │
│    │    └─────────┬──────────┘   │              │          │
│    │              │               │              │          │
│    │ [Qualified?] │ YES           │              │          │
│    │              ├──────────────►│              │          │
│    │              │           [Get country]     │          │
│    │              │               │              │          │
│    │              │ ┌─────────────▼─────────┐   │          │
│    │              │ │ Lookup CPM Rate       │   │          │
│    │              │ │ India = ₹2.5 CPM     │   │          │
│    │              │ └─────────────┬─────────┘   │          │
│    │              │               │              │          │
│    │              │ ┌─────────────▼─────────┐   │          │
│    │              │ │ Calculate Payout      │   │          │
│    │              │ │ = ₹2.5 / 1000         │   │          │
│    │              │ │ = ₹0.0025 per click   │   │          │
│    │              │ └─────────────┬─────────┘   │          │
│    │              │               │              │          │
│    │              │ ┌─────────────▼─────────────────────┐   │
│    │              │ │ SPLIT EARNINGS                    │   │
│    │              │ ├─ Member (80%): ₹0.002 ───────┐   │   │
│    │              │ └─ Admin (20%): ₹0.0005 ────────────┼─►│
│    │              │                                     │   │
│    │              └─────────────────────────────────────┘   │
│    │                                                        │
└─────────────────────────────────────────────────────────────┘

EARNINGS EXAMPLE (1000 qualified clicks):
├─ Member: ₹0.002 × 1000 = ₹2.00
└─ Admin:  ₹0.0005 × 1000 = ₹0.50
```

### Revenue Source 3: Referral Commission

```
┌─────────────────────────────────────────────────────────────┐
│        REFERRAL COMMISSION FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MEMBER A        MEMBER B         ADMIN                    │
│   (Referrer)     (Referred)                                │
│    │                 │              │                     │
│    ├─ Share Code ───►│              │                     │
│    │  "ABC123"      │              │                     │
│    │                 │              │                     │
│    │                 ├─ Sign up    │                     │
│    │                 │ using code  │                     │
│    │                 │              │                     │
│    │                 ├─ Create    │                     │
│    │                 │ links      │                     │
│    │                 │              │                     │
│    │                 ├─ Traffic   │                     │
│    │                 │ comes in   │                     │
│    │                 │              │                     │
│    │                 │ ┌───────────▼──────────┐          │
│    │                 │ │ Qualified Click      │          │
│    │                 │ │ from India: ₹2.5 CPM│          │
│    │                 │ └───────────┬──────────┘          │
│    │                 │             │                     │
│    │                 │ ┌───────────▼──────────────┐      │
│    │                 │ │ Calculate Shares:        │      │
│    │                 │ │                          │      │
│    │                 │ │ Member B (primary):      │      │
│    │                 │ │ ₹2.5 × 0.80 = ₹2.00     │      │
│    │                 │ │                          │      │
│    │                 │ │ Member A (referral 15%):│      │
│    │                 │ │ ₹2.00 × 0.15 = ₹0.30   │      │
│    │                 │ │                          │      │
│    │                 │ │ Admin (margin 20%):      │      │
│    │                 │ │ ₹2.5 × 0.20 = ₹0.50     │      │
│    │                 │ └───────────┬──────────────┘      │
│    │                 │             │                     │
│    │◄─────────────────────────┐ ┌──▼──────┐             │
│    │   +₹0.30                 │ │ +₹2.00   │             │
│    │                          │ │          │             │
│    │                          │ └──────────┘             │
│    │                          │                         │
│    │                        Member B                    │
│    │                                                    │
│    │                                                  Admin
│    │                                                +₹0.50/1000
│    │                                                    │
└─────────────────────────────────────────────────────────────┘

MULTI-TIER EXAMPLE:
Member A (₹0.30) ← Refers ← Member B (₹1.70)
                            ↓ Earns from traffic
                    Visitors (₹2.50 CPM) ← Admin margin (₹0.50)
```

---

## 2. COMPLETE MEMBER EARNINGS FLOW (A Member's Journey)

```
┌────────────────────────────────────────────────────────────────┐
│          MEMBER EARNINGS JOURNEY (30 Days)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DAY 1 - Member signs up                                       │
│  ─────────────────────────────                                 │
│  ├─ Default Plan: FREE                                         │
│  ├─ Balance: ₹0.00                                            │
│  └─ Earnings this month: ₹0.00                                │
│                                                                 │
│  DAY 3 - Member creates first link                             │
│  ──────────────────────────────────                            │
│  ├─ Short code: "abc123"                                      │
│  ├─ Clicks today: 5                                           │
│  └─ Earnings: ₹0.00 (not qualified)                           │
│                                                                 │
│  DAY 5 - Referrals start                                       │
│  ──────────────────────                                        │
│  ├─ Referred 2 members                                        │
│  ├─ Their links get traffic                                  │
│  └─ Commission pending (₹0.30 per qualified click)            │
│                                                                 │
│  DAY 10 - First monetized clicks                               │
│  ──────────────────────────────                                │
│  ├─ 100 qualified clicks from India (₹2.5 CPM)                │
│  ├─ Member earnings: ₹0.002 × 100 = ₹0.20                   │
│  ├─ Wallet balance: ₹0.20                                    │
│  ├─ Commission (referral): 5 clicks × ₹0.30 = ₹1.50          │
│  └─ New balance: ₹1.70                                       │
│                                                                 │
│  DAY 15 - Upgrade plan                                         │
│  ──────────────────────                                        │
│  ├─ Click "Upgrade to Starter"                                │
│  ├─ Pay ₹499 via Razorpay                                     │
│  ├─ New Plan: STARTER                                         │
│  ├─ Balance still: ₹1.70                                      │
│  └─ Higher limits: 100 links, analytics, campaigns           │
│                                                                 │
│  DAY 20 - More traffic coming in                               │
│  ────────────────────────────                                 │
│  ├─ 250 qualified clicks (₹0.002 × 250 = ₹0.50)             │
│  ├─ Commission from 10 referral clicks (₹3.00)                │
│  ├─ New balance: ₹1.70 + ₹0.50 + ₹3.00 = ₹5.20              │
│  └─ Total earnings this month: ₹5.20                         │
│                                                                 │
│  DAY 25 - Request withdrawal                                   │
│  ──────────────────────────                                    │
│  ├─ Request: ₹5.00                                            │
│  ├─ Status: PENDING (admin review)                            │
│  ├─ Available balance: ₹5.20 - ₹5.00 = ₹0.20                │
│  ├─ Pending amount: ₹5.00                                     │
│  └─ Total earnings: ₹5.20 (no change)                        │
│                                                                 │
│  DAY 26 - Admin approves                                       │
│  ────────────────────────                                      │
│  ├─ Withdrawal Status: APPROVED                                │
│  ├─ Balance is NOW locked: ₹0.20                              │
│  ├─ Pending amount: ₹5.00                                     │
│  └─ (Admin arranges payout via bank/UPI)                      │
│                                                                 │
│  DAY 28 - Admin processes payment                              │
│  ──────────────────────────────                                │
│  ├─ Withdrawal Status: PAID                                    │
│  ├─ Member's bank account +₹5.00                              │
│  ├─ System balance: ₹0.20 (untouched)                         │
│  └─ Ready for next cycle                                      │
│                                                                 │
│  DAY 30 - End of month                                         │
│  ──────────────────────                                        │
│  ├─ Total earnings this month: ₹5.20                          │
│  ├─ Total payout: ₹5.00                                       │
│  ├─ Current balance: ₹0.20                                    │
│  ├─ Plan expires on: DAY 45 (30 days from upgrade)           │
│  └─ Status: Ready for next month                              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. DATA FLOW - HOW PAYMENTS MOVE THROUGH THE SYSTEM

```
┌─────────────────────────────────────────────────────────────────┐
│            PAYMENT DATA FLOW DIAGRAM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [CLICK LOG]                                                    │
│  ├─ IP, Country, Browser                                       │
│  ├─ Timestamp, UserAgent                                       │
│  └─ isQualified: boolean                                       │
│      │                                                          │
│      ▼                                                          │
│  [REDIRECT SESSION]                                            │
│  ├─ Funnel steps [1,2,3,4,5]                                  │
│  ├─ Step timings                                              │
│  ├─ Scroll detection                                          │
│  └─ isQualified: true/false                                   │
│      │                                                          │
│      ▼                                                          │
│  [CPM RATE] ◄── Admin sets country rates                       │
│  ├─ Country: "IN"                                             │
│  ├─ CPM: ₹2.5                                                 │
│  └─ Currency: "INR"                                           │
│      │                                                          │
│      ▼                                                          │
│  [PAYOUT CALCULATION]                                          │
│  ├─ Total: ₹2.5 / 1000 = ₹0.0025                              │
│  ├─ Member (80%): ₹0.002                                      │
│  └─ Admin (20%): ₹0.0005                                      │
│      │                                                          │
│      ├──────────────────┬──────────────────┐                  │
│      │                  │                  │                  │
│      ▼                  ▼                  ▼                  │
│  [WALLET]         [WALLET]        [REVENUE LOG]              │
│  (Member)         (Referrer)      (Admin ledger)             │
│  Balance +₹0.002  Balance +₹0.0003 Amount: ₹0.0005           │
│                                                                 │
│      │                  │                  │                  │
│      ▼                  ▼                  ▼                  │
│  [WALLET LEDGER]  [WALLET LEDGER] [ADMIN REPORT]             │
│  Type: CREDIT     Type: CREDIT    (Dashboard)                 │
│  Source: EARNING  Source: REFERRAL Revenue tracked            │
│  Amount: ₹0.002   Amount: ₹0.0003                             │
│                                                                 │
│      │                  │                  │                  │
│      ▼                  ▼                  ▼                  │
│  [MEMBER METRICS] [MEMBER METRICS] [ADMIN EARNINGS]          │
│  Qualified clicks: Earnings:       Total CPM revenue          │
│  +1                +₹0.0003        ₹X/month                  │
│  Earnings: +₹0.002                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. ADMIN EARNINGS BREAKDOWN (Monthly View)

```
┌─────────────────────────────────────────────────────────────────┐
│           ADMIN EARNINGS DASHBOARD (MAY 2026)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL EARNINGS THIS MONTH: ₹127,340.50                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ BREAKDOWN BY SOURCE                                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ 1. PLAN SUBSCRIPTIONS: ₹124,840.00 (97.9%)            │   │
│  │    ├─ Starter (100 members × ₹499): ₹49,900           │   │
│  │    ├─ Pro (50 members × ₹999): ₹49,950                │   │
│  │    └─ Business (10 members × ₹2,499): ₹24,990         │   │
│  │                                                         │   │
│  │ 2. CPM MARGIN (20% of clicks): ₹2,340.50 (1.8%)       │   │
│  │    ├─ India (India rate ₹2.5): ₹1,200                │   │
│  │    ├─ USA (rate $15): ₹800                            │   │
│  │    ├─ UK (rate ₹12.5): ₹340.50                        │   │
│  │    └─ Other: ₹0                                        │   │
│  │                                                         │   │
│  │ 3. REFERRAL COMMISSION: ₹0.00 (0.0%)                  │   │
│  │    └─ (Not yet earned - pending implementation)        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ EARNINGS BY COUNTRY (CPM Portion)                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ India      ████████░░ ₹1,200.00                        │   │
│  │ USA        ███░░░░░░░ ₹800.00                          │   │
│  │ UK         ██░░░░░░░░ ₹340.50                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ DAILY EARNINGS CHART                                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ May 1:  █████████████████░░░░ ₹4,250                   │   │
│  │ May 2:  ██████████░░░░░░░░░░░░ ₹3,800                   │   │
│  │ May 3:  ████████████████████░░ ₹4,500                   │   │
│  │ May 4:  ████████░░░░░░░░░░░░░░ ₹2,900                   │   │
│  │ May 5:  ██████████████░░░░░░░░ ₹3,600                   │   │
│  │ ... (25 days) ...                                      │   │
│  │ May 30: ████████████░░░░░░░░░░ ₹4,000                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  KEY METRICS:                                                   │
│  ├─ Active members: 160 (100 starter + 50 pro + 10 biz)       │
│  ├─ Total qualified clicks: 468,000+                           │
│  ├─ Unique countries: 15                                        │
│  └─ Subscription renewal rate: 92%                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. MEMBER VS ADMIN EARNINGS COMPARISON

```
FOR EVERY ₹100 CPM EARNED FROM ADS:

                TOTAL ₹100
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
     ₹80        ₹20         
    MEMBER     ADMIN      
    (80%)      (20%)       
        │         │         
        │         │    
        ├─────┬───┘         
        │     │             
        ▼     ▼             
      ₹68    ₹12            
    MEMBER  ADMIN           
   (85% of  (Keep)          
    ₹80 if              
   referred)           

    BREAKDOWN IF REFERRED:
    ┌──────────────────┐
    │ Original CPM: 100│
    ├──────────────────┤
    │ Referrer: ₹12    │
    │ (15% × ₹80)      │
    ├──────────────────┤
    │ Member: ₹68      │
    │ (₹80 - ₹12)      │
    ├──────────────────┤
    │ Admin: ₹20       │
    │ (20% always)     │
    └──────────────────┘
    Total: ₹100 ✓
```

---

## 6. PAYMENT SYSTEM STATE MACHINE

```
SUBSCRIPTION PAYMENT STATES:
────────────────────────────

                    ┌─────────────────────┐
                    │   PENDING_PAYMENT    │
                    │  (Order created in   │
                    │    Razorpay)         │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Member pays via    │
                    │  Razorpay gateway   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PAYMENT_CAPTURED   │
                    │  (Razorpay confirms)│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  INVOICE CREATED       │
                    │  Status: PAID          │
                    │  Amount: ₹499/999/2499 │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  USER SUBSCRIPTION     │
                    │  Updated:              │
                    │  ├─ planId set         │
                    │  ├─ expiresAt = +30 days
                    │  └─ invoiceId saved    │
                    └────────────────────────┘

WITHDRAWAL STATES:
──────────────────

    ┌──────────────────┐
    │  MEMBER REQUESTS │
    │  WITHDRAWAL ₹100 │
    └────────┬─────────┘
             │
    ┌────────▼─────────────┐
    │  PENDING             │
    │ (Admin reviews)      │
    │ Wallet RESERVED:     │
    │ Available: -₹100     │
    │ Pending: +₹100      │
    └────────┬─────────────┘
             │
       ┌─────┴────┬──────────┐
       │           │          │
    APPROVE    REJECT    [Time-out]
       │           │          │
       ▼           │          ▼
    ┌────┐         │    [Re-request]
    │ A  │         │
    │ P  │         ▼
    │ P  │    ┌──────────────┐
    │ R  │    │  REJECTED    │
    │ O  │    │  Wallet:     │
    │ V  │    │  Available:  │
    │ E  │    │  +₹100       │
    │ D  │    │  Pending: -₹100
    └──┬─┘    └──────────────┘
       │
       │ (Admin transfers money)
       │
       ▼
    ┌──────────────────┐
    │  PAID            │
    │ (Process done)   │
    │ Wallet locked    │
    └──────────────────┘
```

