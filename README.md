# Role-Based URL Shortener SaaS

Production-oriented monorepo URL shortener platform with:

- Next.js frontend (`apps/web`)
- Express + TypeScript backend (`apps/api`)
- MongoDB Atlas + Mongoose
- JWT auth + refresh rotation + RBAC (`ADMIN`, `USER`)
- Admin URL moderation + email notifications
- Public redirect engine + click tracking
- Google OAuth support

---

## Monorepo Structure

```text
apps/
  api/   # Express API
  web/   # Next.js App Router frontend
```

---

## Tech Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS, Zustand
- Backend: Node.js, Express.js, TypeScript
- Database: MongoDB Atlas (Mongoose)
- Auth: JWT + Refresh Token + Google OAuth + RBAC
- Email: Nodemailer (SMTP)

---

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment files

Create:

- `apps/api/.env` (see `apps/api/.env.example` for all keys)
- `apps/web/.env.local` (see `apps/web/.env.example`)

Optional bootstrap scripts (after `.env` is configured):

```bash
npm run seed:plans --workspace @link-shortener/api
npm run seed:admin --workspace @link-shortener/api
```

### 3) Run backend and frontend

```bash
npm run dev:api
npm run dev:web
```

### 4) Health check

```bash
http://localhost:5000/api/v1/health
```

---

## Required Environment Variables

### Backend (`apps/api/.env`)

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `CLIENT_ORIGIN`
- `APP_PUBLIC_URL`
- `APP_ANON_OWNER_ID` (placeholder owner ObjectId for anonymous/public links; defaults to all-zero ObjectId)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN_DAYS`
- `RAZORPAY_KEY_ID` (optional; required for paid checkout — same value as `NEXT_PUBLIC_RAZORPAY_KEY_ID` on the web app)
- `RAZORPAY_KEY_SECRET` (optional; used to create orders and to **verify** payments after Checkout via `POST /api/v1/payments/razorpay/verify`; no webhook secret)
- `CONTACT_TO_EMAIL` (optional; enables `POST /api/v1/contact` from the marketing site)

### Frontend (`apps/web/.env.local`)

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (optional; required for Razorpay Checkout on `/pricing`)

---

## Deploy (Render + Vercel)

The repo includes a **Render Blueprint** (`render.yaml`) and a minimal **Vercel** config (`apps/web/vercel.json`). Use either host you prefer for the Next.js app; the API fits well on Render (or any Node host).

### Render (API + optional web)

**Option 1 — Blueprint (recommended)**  
Use the root `render.yaml`: it defines two web services that build from the **monorepo root** (`npm ci` uses the root `package-lock.json`).

1. In [Render](https://dashboard.render.com): **New** → **Blueprint** → connect this GitHub repo.
2. On first apply, Render prompts for every `sync: false` secret (MongoDB, JWT, SMTP, Google, URLs, etc.).
3. After deploy, note the API URL (for example `https://link-shortener-api.onrender.com`).

**Important production URLs**

| Variable | Typical value |
| --- | --- |
| `CLIENT_ORIGIN` | Your **frontend** origin only, e.g. `https://your-app.vercel.app` (no trailing slash). CORS allows this origin to call the API. |
| `APP_PUBLIC_URL` | Public base for short links, usually the **same** as the frontend (`https://your-app.vercel.app`) so short URLs look like `https://your-app.vercel.app/r/abc123`. |
| `GOOGLE_CALLBACK_URL` | `https://<api-host>/api/v1/auth/google/callback` |

Health check (API): `GET /api/v1/health` (configured in `render.yaml`).

**Option 2 — Two manual Web Services** (per-service root directory)

| | API | Web |
| --- | --- | --- |
| Root Directory | `apps/api` | `apps/web` |
| Build Command | `npm install && npm run build` | `npm install && npm run build` |
| Start Command | `npm run start` | `npm run start` |

If you use this option, each service only sees its subfolder; `npm install` does not use the root lockfile. Prefer the Blueprint root build when possible.

**`next start` and `PORT`**  
`apps/web` uses `next start` without a hard-coded port so **Render** and **Vercel** can inject `PORT` correctly.

### Vercel (frontend only)

1. [Vercel](https://vercel.com) → **Add New** → **Project** → import this repo.
2. **Root Directory**: `apps/web` (required so Next.js resolves correctly).
3. **Framework Preset**: Next.js (auto-detected).
4. **Environment Variables** (Production — and Preview if you use OAuth there):

   - `NEXT_PUBLIC_API_BASE_URL` = `https://<your-api-host>/api/v1` (no trailing slash)
   - `NEXT_PUBLIC_APP_URL` = `https://<your-vercel-deployment>` (canonical site URL; use the production domain once assigned)

5. Redeploy after changing env vars (they are baked in at build time for `NEXT_PUBLIC_*`).

**Google OAuth** (if used): In Google Cloud Console, add **Authorized JavaScript origins** and **Authorized redirect URIs** for both your Vercel URL and the API callback URL above.

**Order of operations**

1. Deploy API → set secrets → confirm `/api/v1/health`.
2. Deploy web with `NEXT_PUBLIC_*` pointing at the live API and app URL.
3. Update API `CLIENT_ORIGIN` (and `APP_PUBLIC_URL` if needed) to match the real frontend URL, then redeploy API.

---

## GitHub Push Workflow

```bash
git add .
git commit -m "feat: production-ready role-based URL shortener platform"
git push -u origin main
```

If your default branch is not `main`, push your current branch instead.

---

## Security Notes

- Never commit real `.env` files.
- `.gitignore` already excludes:
  - `.env`
  - `.env.*`
  - `node_modules`
- Rotate any secret immediately if exposed accidentally.
- Keep SMTP, JWT, MongoDB, and Google OAuth secrets in Render/GitHub environment settings only.

---

## Useful Commands

```bash
# API checks
npm run typecheck --workspace @link-shortener/api
npm run test --workspace @link-shortener/api

# Web checks
npm run typecheck --workspace @link-shortener/web
```
