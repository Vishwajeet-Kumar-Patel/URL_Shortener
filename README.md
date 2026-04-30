# Purplemerit: Next-Gen Monetized Link Shortener SaaS

Purplemerit is a high-performance, enterprise-ready Link Shortener SaaS built for the creator economy. It features a sophisticated multistep monetization funnel, transparent referral attribution, and a real-time earnings engine.

## 🚀 Key Features

*   **Multistep Monetization Funnel**: A 5-stage verification process for redirects, ensuring high-quality traffic for advertisers and maximum payouts for creators.
*   **Referral Attribution Engine**: Automatic tracking of referred traffic and link generation, even for anonymous users.
*   **Bulk URL Generator**: Batch process hundreds of links instantly with plan-based limits.
*   **Real-time Earnings Ledger**: Integrated wallet system with qualified click payouts (CPM) and referral commissions.
*   **Role-Based Access Control (RBAC)**: Secure partitioned interfaces for Admins, Members, and Advertisers.
*   **Advanced Analytics**: Deep insights into clicks, unique visits, country-wise distribution, and device behavior.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Web Client - Next.js] <--> API[API Gateway - Express]
    API <--> Auth[Auth Service - JWT/Google]
    API <--> UrlS[URL Service]
    API <--> RedirS[Redirect & Funnel Service]
    API <--> WalletS[Wallet & Earnings Service]
    
    UrlS <--> DB[(MongoDB)]
    RedirS <--> DB
    WalletS <--> DB
    
    RedirS <--> Session[Session Store - Redis/DB]
```

### Database Relationship Flow

```mermaid
erDiagram
    USER ||--o{ SHORT_URL : owns
    USER ||--o{ WALLET : has
    USER ||--o{ REFERRAL : has_profile
    
    SHORT_URL ||--o{ CLICK_LOG : generates
    SHORT_URL ||--o{ REDIRECT_SESSION : creates
    
    ANONYMOUS_SESSION ||--o{ SHORT_URL : refers
    ANONYMOUS_SESSION ||--o{ REDIRECT_SESSION : tracks
    
    WALLET ||--o{ WALLET_LEDGER : contains
```

---

## 🛠️ Workflows

### 1. Public Redirect Workflow (Monetized)

```mermaid
sequenceDiagram
    participant User as Visitor
    participant Redir as Redirect Controller
    participant Funnel as Funnel Service
    participant Target as Destination
    
    User->>Redir: Click /r/:shortCode
    Redir->>Funnel: Create Redirect Session
    Redir->>User: 302 Redirect to /funnel/:sessionId
    
    loop 5 Step Funnel
        User->>Funnel: Validate Step (Timer/Scroll/CTA)
        Funnel->>User: Advance to Next Step
    end
    
    User->>Funnel: Final Unlock
    Funnel->>Target: Redirect to Original URL
    Funnel->>Wallet: Credit Payout (if qualified)
```

### 2. Referral Attribution Workflow

```mermaid
sequenceDiagram
    participant User as Public User
    participant Web as Next.js App
    participant API as API Server
    
    User->>Web: Visit /?ref=MEMBER_CODE
    Web->>Web: Store code in Cookie
    User->>Web: Create Short URL
    Web->>API: POST /urls/public (with ref code)
    API->>API: Create Anonymous Session
    API->>API: Link URL to Member
    API->>User: Return Short URL
```

---

## 📁 Folder Architecture

```text
link-shortener/
├── apps/
│   ├── api/                # Express.js Backend
│   │   ├── src/
│   │   │   ├── models/     # Mongoose Schemas (21 Models)
│   │   │   ├── modules/    # Business Logic (Auth, URL, Redirect, Wallet)
│   │   │   ├── repositories/ # DB Access Layer
│   │   │   └── scripts/    # Seeding & Jobs
│   └── web/                # Next.js Frontend (App Router)
│       ├── src/
│       │   ├── app/        # Pages (Admin, Dashboard, Funnel)
│       │   ├── components/ # UI Components (Tailwind + Lucide)
│       │   └── store/      # State Management (Zustand)
└── packages/               # Shared Types & Configs
```

---

## 🚦 Local Setup

1.  **Clone the Repository**
2.  **Install Dependencies**: `npm install`
3.  **Environment Setup**: 
    *   Copy `apps/api/.env.example` to `apps/api/.env`
    *   Copy `apps/web/.env.example` to `apps/web/.env`
4.  **Database Seeding**: 
    ```bash
    cd apps/api
    npx ts-node src/scripts/seed-plans.ts
    npx ts-node src/scripts/seed-demo-data.ts
    ```
5.  **Run Development Servers**:
    ```bash
    npm run dev:api
    npm run dev:web
    ```

---

## 📈 Roadmap

- [x] Multistep Monetization Funnel
- [x] Referral Attribution Engine
- [x] Bulk URL Generator
- [x] Member Analytics Dashboard
- [ ] Multi-currency Support
- [ ] API Webhooks for Developers
- [ ] Mobile App (Flutter/React Native)

---

&copy; 2026 Purplemerit Engineering. All rights reserved.
