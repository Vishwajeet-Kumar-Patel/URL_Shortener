# Purplemerit Link Shortener SaaS

Purplemerit is a monetized URL shortener built around signed redirect sessions, staged content funnels, referral attribution, and payout tracking. The current implementation keeps the existing admin and member surfaces intact while replacing the old direct-redirect behavior with a real qualification engine.

## What It Does

- Creates short links for members and anonymous traffic.
- Routes public visitors through a signed monetization funnel instead of sending them directly to the destination.
- Tracks raw opens, funnel progress, sponsor clicks, and qualified completions separately.
- Credits member earnings only after a unique qualified completion.
- Keeps admin and member analytics aligned with the same qualified-completion ledger.

## Main Surfaces

- `apps/api`: Express API, MongoDB models, redirect session engine, wallet, referrals, analytics.
- `apps/web`: Next.js marketing pages, public visit flow, monetized blog pages, and dashboards.

## Redirect Flow

1. Visitor opens `/{shortCode}` or `/r/{shortCode}`.
2. The browser is forwarded to `/visit/{shortCode}`.
3. The API creates a signed redirect session and records the raw open.
4. The visitor passes through `/monetize/start`, `/monetize/blog/1`, `/monetize/blog/2`, `/monetize/blog/3`, and `/monetize/unlock`.
5. The API validates each stage, suppresses duplicate completions for 48 hours, credits the member, and returns the original destination only at the end.

## Documentation

- [System design and route map](docs/system-design.md)

## Local Development

Use the existing workspace scripts for the API and web apps, then seed demo data from `apps/api/src/scripts/seed-demo-data.ts` to populate the dashboards with realistic records.

## Notes

- The legacy quick-start markdown has been removed in favor of the architecture doc.
- Public session payloads intentionally avoid exposing the final destination before unlock.
