# Monetization and Business Modules Implementation Plan

This plan outlines the implementation of critical missing business logic for the Link Shortener SaaS, focusing on member referral attribution, earning calculations, a multi-step redirection funnel, and bulk URL generation.

## User Review Required

> [!IMPORTANT]
> The implementation uses MongoDB + Mongoose as per the existing codebase, despite the mention of PostgreSQL + Prisma in the prompt. I will proceed with Mongoose to maintain consistency and avoid unnecessary refactoring.

> [!WARNING]
> The "Public Blog Monetization Page" (Module 3) will require a professional design with placeholder ad blocks. I will implement a responsive, premium-looking blog template for this.

## Proposed Changes

### Module 1: Member Referral Attribution Engine

Capture and store referral attribution for anonymous users.

#### [MODIFY] [layout.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/layout.tsx)
- Add a client-side component to check for `?ref=` query parameter.
- Store the referral code in a cookie (e.g., `referral_code`) with a 30-day expiration.

#### [MODIFY] [page.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/page.tsx)
- Automatically read the `referral_code` cookie and populate the "Referral Code" field in the anonymous shortener form.

#### [MODIFY] [url.controller.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/urls/url.controller.ts)
- Update `createPublicUrl` to extract `referralCode` or `memberId` from the request body or session and pass it to the service.

#### [MODIFY] [url.service.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/urls/url.service.ts)
- Ensure public URLs are saved with `createdByMemberId` and `anonymousSessionId`.
- Call `anonSessionService.trackLinkGeneration` when a public link is created under a member.

---

### Module 2: Member Earning Calculation Logic

Implement the logic to credit earnings to members when traffic completes the funnel.

#### [MODIFY] [constants.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/config/constants.ts)
- Define earning rates (e.g., `PAYOUT_PER_QUALIFIED_CLICK = 0.5`).

#### [MODIFY] [redirect.service.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/redirect/redirect.service.ts)
- Implement `creditQualifiedPayout` to update member metrics and wallet ledgers.
- Calculate platform margin and member earnings.

---

### Module 3: Public Blog Monetization Page + Multistep Funnel

Create the high-priority monetization funnel.

#### [NEW] [funnel/page.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/funnel/[sessionId]/page.tsx)
- Implement the 5-step funnel UI:
    - Step 1: Professional blog page with 10s timer.
    - Step 2: Scroll detection + second 10s timer.
    - Step 3: Sponsor link button (external tab).
    - Step 4: Verification section + final 10s timer.
    - Step 5: Unlock destination button.

#### [MODIFY] [funnel-validation.service.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/redirect/funnel-validation.service.ts)
- Enhance step validation logic to include timer and scroll checks.
- Track step completion in the `RedirectSession`.

#### [MODIFY] [redirect.controller.ts](file:///c:/Users/api/src/modules/redirect/redirect.controller.ts)
- Update `validateFunnelStep` to return the next step state.
- Add `unlockDestination` endpoint to verify full completion before returning the original URL.

---

### Module 4: Bulk URL Generator for Member

Allow members to shorten URLs in batch.

#### [NEW] [mass-shrinker/page.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/dashboard/mass-shrinker/page.tsx)
- Textarea for pasting multiple URLs.
- Progress indicator for batch processing.

#### [MODIFY] [url.controller.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/urls/url.controller.ts)
- Add `createBulkUrls` endpoint.

#### [MODIFY] [url.service.ts](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/api/src/modules/urls/url.service.ts)
- Implement `createBulkUrls` logic with batch processing and plan limit checks.

---

### Module 5: Member Associated Traffic Users View

Show anonymous users brought by the member.

#### [NEW] [partner/traffic/page.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/dashboard/partner/traffic/page.tsx)
- Table showing anonymous sessions, generated links, clicks, and earnings.

#### [MODIFY] [dashboard/page.tsx](file:///c:/Users/vishw/OneDrive/Desktop/Purplemerit/Link_Shortener/apps/web/src/app/dashboard/page.tsx)
- Update widgets to show "Total Anonymous Referred Sessions", "Total Anonymous Links", etc.

## Verification Plan

### Automated Tests
- Run existing unit tests for URL creation and redirection.
- Add new tests for earning calculations and bulk shortening.

### Manual Verification
1. Visit the homepage with `?ref=...`, generate a link, and check if it's attributed to the member.
2. Complete the full 5-step funnel and verify that:
    - Timers work correctly.
    - Scroll is required.
    - Earnings are credited to the member's wallet.
    - Payout is reflected in the dashboard.
3. Test the Bulk URL Generator with 10+ links.
4. Verify the Traffic Users View shows correct data.
