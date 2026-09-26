# QasiNet

Automated telecom airtime and Faiba 4G data bundles vending platform with instant Safaricom M-Pesa payment integration in Kenya.

QasiNet enables customers to purchase airtime across all major Kenyan telecommunications networks (Safaricom, Airtel, Telkom, Equitel, Faiba) and Faiba high-speed data bundles with automated M-Pesa STK Push collection and sub-5-second telecom fulfillment. Built with Next.js, Supabase, and Vercel, it features dual-layer reconciliation, live order tracking, and an administrative control suite with real-time service locking.

For comprehensive architectural design, provider quirks, transaction state machines, and operational guidelines, see [HANDOVER.md](file:///c:/Users/HomePC/Desktop/Qasinet/HANDOVER.md).

---

## Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) 16.3.4 (App Router, Turbopack)
* **Runtime & UI**: React 19.2.8, React DOM 19.2.8
* **Language**: TypeScript 5.x
* **Styling**: Tailwind CSS v4, Lucide React Icons, Radix UI Slot
* **Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js` v2.114.0, `@supabase/ssr` v0.12.5) with PostgreSQL & Row Level Security (RLS)
* **Transactional Email**: [Resend](https://resend.com/) (`resend` SDK v6.26.0)
* **Testing Framework**: [Vitest](https://vitest.dev/) v4.1.11 with `@vitest/coverage-v8`
* **Data Visualization & Toasts**: Recharts, React Hot Toast, Canvas Confetti
* **Hosting & Edge**: [Vercel](https://vercel.com/) Serverless & Edge Network

---

## Integrations

| Provider | Purpose | Documentation / Portal |
| :--- | :--- | :--- |
| **Safaricom M-Pesa Daraja** | Real-time payment collection via STK Push (Lipa Na M-Pesa Online) and C2B Paybill webhook ingestion | [Daraja Developer Portal](https://developer.safaricom.co.ke/) |
| **Kyanda Telecommunications** | Upstream telecom vending gateway for Airtime (Safaricom, Airtel, Telkom, Equitel, Faiba) and Faiba Data Bundles | [Kyanda API](https://api.kyanda.app) |
| **Bingwa Sokoni** | Reseller API integration for discounted Safaricom & Airtel heavy data packs (locked pending live reseller credentials) | [Bingwa Soko](https://bingwasoko.co.ke) |
| **Supabase** | Cloud PostgreSQL database, user authentication, profile storage, and Row Level Security enforcement | [Supabase Dashboard](https://supabase.com/dashboard) |
| **Resend** | Outbound transactional receipts, password reset OTPs, and administrator critical refund alert notifications | [Resend Dashboard](https://resend.com/) |
| **Vercel** | Edge runtime deployment, automated Git CI/CD deployments, and scheduled Vercel Cron reconciliation triggers | [Vercel Dashboard](https://vercel.com/) |
| **Hosting.com DNS** | Domain registrar & DNS nameserver host for `qasinet.com` and `www.qasinet.com`, managing CNAME and Resend SPF/DKIM verification | [Hosting.com](https://hosting.com) |

---

## Local Setup Instructions

### Prerequisites
* **Node.js**: v20.x or higher
* **Package Manager**: `npm` (v10+)
* **Git**: Installed and configured

### 1. Clone & Install
```bash
git clone https://github.com/expertsocial/Qasinet.git
cd Qasinet
npm install
```

### 2. Configure Environment Variables
Create a local environment file by copying the template:
```bash
cp .env.example .env.local
```

Below is the complete reference of all environment variables used by the application. **Do not commit secret keys to version control.**

#### Application & Public Configuration
* `NEXT_PUBLIC_BASE_URL` — Canonical public base URL (`https://www.qasinet.com`). *Must include `www.` in production to avoid Vercel 308 redirect dropping telecom webhooks.*
* `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — Google Search Console HTML meta tag token for search indexing verification.
* `NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES` — Feature flag to display Faiba data bundle catalog (`true` / `false`).

#### Supabase Database & Auth
* `NEXT_PUBLIC_SUPABASE_URL` — Supabase project API URL (`https://<project-id>.supabase.co`).
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous public client key (subject to PostgreSQL Row Level Security).
* `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role secret key (bypasses RLS; used strictly in server-side Route Handlers for webhooks, admin tasks, and system automation).

#### Safaricom M-Pesa Daraja API
* `MPESA_CONSUMER_KEY` — Safaricom Daraja App Consumer Key.
* `MPESA_CONSUMER_SECRET` — Safaricom Daraja App Consumer Secret.
* `MPESA_PASSKEY` — Lipa Na M-Pesa Online passkey for STK Push request encryption.
* `MPESA_SHORTCODE` — Business Shortcode (Paybill or Till Number) used for payment collection.
* `MPESA_TILL_NUMBER` — Store Number or Till Number (set to match shortcode if using buy-goods till).
* `MPESA_ENVIRONMENT` — Environment mode: `production` or `sandbox`.
* `MPESA_INITIATOR_NAME` — Initiator username for transaction status queries.
* `MPESA_INITIATOR_PASSWORD` — Encrypted initiator password for status queries.
* `MPESA_C2B_SECRET` — Optional secret query parameter to authenticate incoming Safaricom C2B webhook calls (`/api/webhooks/mpesa/c2b`).

#### Kyanda Vending API
* `KYANDA_BASE_URL` — Base API endpoint for Kyanda (defaults to `https://api.kyanda.app`).
* `KYANDA_API_KEY` — Kyanda merchant API authorization key.
* `KYANDA_MERCHANT_ID` — Kyanda merchant account identifier.
* `KYANDA_SECURITY_KEY` — Kyanda cryptographic signature / security key.
* `KYANDA_CALLBACK_URL` — Destination webhook endpoint for Kyanda async vending updates (`https://www.qasinet.com/api/webhooks/kyanda`).
* `KYANDA_INITIATOR_PHONE` — Registered merchant phone number required for transaction dispatch.
* `KYANDA_PAYBILL_ACCOUNT_FIELD` — Account identifier field name (`account` or `phone`).
* `KYANDA_KPLC_PREPAID_CHANNEL` — KPLC Prepaid channel identifier (`KPLC_PREPAID` — *utility channel discontinued upstream*).
* `KYANDA_KPLC_POSTPAID_CHANNEL` — KPLC Postpaid channel identifier (*discontinued upstream*).

#### Merchant Float & Circuit Breaker
* `FLOAT_CHECK_ENABLED` — Enables real-time wallet balance verification before accepting checkout (`true` / `false`).
* `FLOAT_CHECK_FAIL_OPEN` — Fallback mode if balance endpoint times out: `true` allows STK push (fails open to safety net); `false` halts checkout.
* `MIN_FLOAT_BUFFER` — Minimum flat wallet balance buffer in KES (default: `50`).
* `FLOAT_BUFFER_PERCENT` — Dynamic buffer percentage calculated against order value (default: `5`).
* `FLOAT_CACHE_TTL_MS` — In-memory balance cache lifespan in milliseconds (default: `45000` = 45s).

#### Reseller API (Bingwa Sokoni)
* `BINGWA_SOKONI_BASE_URL` — Bingwa Sokoni API base URL (`https://bingwasoko.co.ke/api`).
* `BINGWA_SOKONI_TILL` — Reseller till number.
* `BINGWA_SOKONI_API_KEY` — Reseller API authorization key.
* `BINGWA_SOKONI_CALLBACK_URL` — Webhook endpoint for Bingwa Sokoni callbacks (`https://www.qasinet.com/api/webhooks/bingwa`).
* `BINGWA_WEBHOOK_SECRET` — Secret token to verify signature of incoming Bingwa Sokoni callbacks.

#### Transactional Email & Admin Alerts (Resend)
* `RESEND_API_KEY` — Resend API authorization key (`re_...`).
* `RESEND_FROM_EMAIL` — Outbound sender address (e.g. `QasiNet <noreply@qasinet.com>`).
* `ADMIN_ALERT_EMAIL` — Destination email address for critical refund notices and administrator 2FA OTP codes (e.g. `qasinetltd@gmail.com`).

#### Automation & System Cron
* `CRON_SECRET` — Bearer authentication secret required by `/api/cron/reconcile` to protect reconciliation sweeps.
* `TEST_API_SECRET` — Authorization secret required for development test routes (`/api/test-daraja`, `/api/test-kyanda`).

---

## Running the Application

### Development Server
Starts the Next.js development server with Turbopack on port `4000`:
```bash
npm run dev
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

### Running Automated Tests
Executes the Vitest test suite across all unit and integration specifications:
```bash
npm test
```
To run tests in watch mode during development:
```bash
npx vitest
```

### Production Build & Verification
Compile and validate TypeScript types, generate static assets, and assemble the production bundle:
```bash
npm run build
```

To run the compiled production build locally:
```bash
npm start
```

---

## Detailed Technical Documentation

For complete architectural specifications, service matrices, transaction state machines, provider gotchas, and manual refund procedures, consult:

👉 **[HANDOVER.md](file:///c:/Users/HomePC/Desktop/Qasinet/HANDOVER.md)**
