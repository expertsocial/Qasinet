# QasiNet — Technical Handover & Developer Guide

This document is the engineering reference for the QasiNet codebase. It is written for future developers, maintainers, or technical leads inheriting the project. It describes the actual architecture, operational status, known integration quirks, and incomplete work honestly and precisely as it exists in the codebase today.

---

## 1. Project Status & Service Matrix

QasiNet's services fall into three distinct operational states: **Active/Live**, **Locked (Pending Credentials)**, and **Permanently Discontinued (Upstream Vendor Deprecation)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ QASINET SERVICE LIFECYCLE                                              │
├───────────────────────────────┬────────────────────────────────────────┤
│ Active & Live                 │ Safaricom Airtime                      │
│ (Fully Automated Vending)     │ Airtel Airtime                         │
│                               │ Telkom Airtime                         │
│                               │ Equitel Airtime                        │
│                               │ Faiba Airtime                          │
│                               │ Faiba 4G Data Bundles (1GB–Unlimited)  │
├───────────────────────────────┼────────────────────────────────────────┤
│ Locked Pending Credentials    │ Bingwa Sokoni Safaricom Heavy Bundles  │
│ (Code Complete, Keys Missing) │ Bingwa Sokoni Airtel Bamba Bundles     │
├───────────────────────────────┼────────────────────────────────────────┤
│ Permanently Discontinued      │ KPLC Electricity Tokens (Pre/Postpaid) │
│ (Upstream Vendor Deprecation; │ Pay TV Subscriptions (DStv, GOtv, etc) │
│ Deliberately Hidden)          │ Water Utilities (Nairobi Water)        │
└───────────────────────────────┴────────────────────────────────────────┘
```

### 1.1 Active & Live Services

* **Airtime Top-Ups (All 5 Networks)**:
  * Safaricom (`safaricom-airtime`), Airtel (`airtel-airtime`), Telkom (`telkom-airtime`), Equitel (`equitel-airtime`), Faiba (`faiba-airtime`).
  * Fulfilled automatically via Kyanda's airtime vending API (`/billing/v1/airtime-vending`).
  * Real-time Safaricom STK Push payment collection with sub-5-second vending execution upon payment confirmation.
* **Faiba 4G Data Bundles**:
  * High-speed packages: 1GB, 8GB, 25GB, 40GB, and Unlimited.
  * Fulfilled automatically via Kyanda's data bundle endpoint using service identifier `FAIBA_B`.
  * Recipient phone numbers must be valid Faiba 4G lines (`0747xxxxxx` or `254747xxxxxx`).

### 1.2 Locked Pending Credentials

* **Bingwa Sokoni Reseller Bundles (Safaricom & Airtel)**:
  * The provider integration is fully written and tested in `src/lib/providers/bingwa/` and `src/services/providers/BingwaProvider.ts`.
  * **Blocker**: The upstream reseller (Bingwa Soko) has not yet issued production merchant credentials (till number and API key).
  * **Current State**: The services are registered in `src/lib/services/registry.ts`, but are marked disabled/locked in the database `service_status` table (`NEXT_PUBLIC_SERVICE_STATUS_SAFARICOM_DATA=disabled`). They will remain inaccessible to customers until valid credentials are added to `.env.local` / Vercel environment variables and enabled via the Admin Service Control dashboard (`/admin/services/control`).

### 1.3 Permanently Discontinued Upstream (Do Not Attempt to Fix)

* **KPLC Prepaid/Postpaid Electricity Tokens, Pay TV (DStv, GOtv, StarTimes, Zuku), and Nairobi Water**:
  * **IMPORTANT NOTICE FOR FUTURE DEVELOPERS**: These services were previously planned and partially integrated, but **Kyanda abruptly withdrew and deprecated their Pay Bill utility vending infrastructure** (returning HTTP 404, empty product lists, or rejecting Pay Bill channels with gateway errors).
  * This is an **upstream provider limitation**, NOT a bug in the QasiNet codebase.
  * To prevent customer friction and accidental float loss, these services were **permanently removed from user navigation, blocked in the checkout API, and hidden from the homepage**.
  * **Action Required from Maintainers**: Do **not** spend time attempting to debug or re-enable KPLC, TV, or Water under the Kyanda provider. If utility vending is required in the future, QasiNet must contract with a different utility aggregator (e.g., Africa's Talking, Beyonic, or directly with Kenya Power / Paybill integrations) and implement a new provider client implementing the `VendingProvider` interface.

---

## 2. Architecture Overview

```text
                                 [ Customer Browser / Mobile ]
                                               │
                                      POST /api/transactions
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │     CHECKOUT CHOKE POINT         │
                              │  - Rate Limiting                 │
                              │  - Input Validation (Zod)        │
                              │  - Service Lock Verification     │
                              │  - Kyanda Float Pre-Check        │
                              │  - Supabase Transaction Creation │
                              └─────────────────┬────────────────┘
                                                │
                                      Initiate STK Push
                                                ▼
                                    [ Safaricom Daraja API ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
             M-Pesa Webhook Callback                           Polling / Cron Fallback
             POST /api/webhooks/mpesa                          GET /api/cron/reconcile
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                │
                                    Verify ResultCode === 0
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │    SHARED VENDING SERVICE        │
                              │ executeVendingForTransaction()   │
                              │  - Idempotency Lock              │
                              │  - Kyanda / Provider Dispatch    │
                              │  - State -> SUCCESS              │
                              │  - Resend Receipt Dispatch       │
                              └──────────────────────────────────┘
```

### 2.1 The Single Checkout Choke Point

All purchases across the entire application pass through a single, hardened entry point:

* **Route**: `src/app/api/transactions/route.ts` (handling `POST /api/transactions`).
* **Sequence of Execution**:
  1. **Rate Limiting**: Checks client IP against token-bucket rate limits (`src/lib/security/rate-limit.ts`).
  2. **Validation**: Validates amount, Kenyan phone format (`07...`, `01...`, `254...`), and service slug against Zod schemas.
  3. **Service Status Enforcement**: Calls `getServiceStatus(serviceSlug)`. If the service is locked in the database `service_status` table (`disabled`, `maintenance`, or `coming_soon`), the request is rejected with HTTP 403 before any payment is initiated.
  4. **Pre-Flight Float Check**: Calls `checkFloatAvailability(amount)` in `src/lib/services/float.ts`. If Kyanda merchant balance is insufficient to vend the service after payment, the checkout fails immediately with a clear user notice rather than stranding customer funds.
  5. **Transaction Record Creation**: Inserts record into Supabase `transactions` table with status `CREATED`.
  6. **M-Pesa STK Prompt**: Dispatches Lipa Na M-Pesa Online STK Push via `MpesaProvider.initiateSTKPush()`. On prompt acceptance, status transitions to `PAYMENT_PENDING`.

### 2.2 Shared Vending Service (`src/lib/services/vending.ts`)

To eliminate race conditions and guarantee immediate delivery, all vending executions flow through a single centralized function:

```typescript
export async function executeVendingForTransaction(
  transactionId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }>
```

* **Idempotency Guard**: Atomically checks if the transaction is already in `SUCCESS` or already has a valid `kyanda_reference`. If so, it returns immediately to prevent double-vending.
* **Provider Routing**: Inspects `service_type` and dispatches to `KyandaProvider.buyAirtime()` or `KyandaProvider.buyDataBundle()`.
* **State Transition**:
  * On vendor success: Records `kyanda_reference`, sets status to `SUCCESS`, logs event to `transaction_events`, and triggers background email receipt via Resend.
  * On vendor failure: Transitions status to `VENDING_FAILED_REFUND_PENDING`, records failure reason, logs error, and dispatches critical alert emails to both the customer and `qasinetltd@gmail.com`.

### 2.3 Service Registry & Service Lock Table Layering

QasiNet uses a two-tier configuration model to balance code-level safety with zero-downtime runtime control:

1. **Tier 1: Code-Level Registry (`src/lib/services/registry.ts`)**
   * Defines all static metadata: service slugs, display names, providers (`kyanda`, `bingwa`), pricing models, minimum/maximum limits, and phone prefix validation rules.
   * Acts as the baseline configuration and fallback if the database is unreachable.
2. **Tier 2: Database Override Lock Table (`src/lib/services/service-lock.ts` & `service_status` table)**
   * Stored in PostgreSQL (`service_status` table: `service_id`, `status`, `reason`, `updated_at`).
   * Allowed statuses: `enabled`, `disabled`, `maintenance`, `coming_soon`.
   * **Precedence**: The database status overrides the code registry. If an admin disables a service in `/admin/services/control`, it takes effect across all clients within 30 seconds (due to in-memory TTL caching) without requiring a code commit or redeployment.

### 2.4 Transaction State Machine

The transaction lifecycle is governed by strict state transitions:

```text
[CREATED]
   │
   ▼
[PAYMENT_PENDING] ───────────────► [PAYMENT_FAILED]
   │ (M-Pesa STK Prompt Accepted)       (PIN Timeout / Cancelled / Insufficient M-Pesa)
   ▼
[PAYMENT_CONFIRMED]
   │
   ▼
[VENDING_PENDING]
   │
   ├─────────────────────────────► [SUCCESS]
   │ (Provider Vending Succeeded)       (Delivered to Recipient SIM)
   │
   └─────────────────────────────► [VENDING_FAILED_REFUND_PENDING]
     (Provider Float / Downtime)        (Customer & Admin Notified; Manual Refund Queued)
```

* **`CREATED`**: Initial checkout record generated in Supabase.
* **`PAYMENT_PENDING`**: STK Push sent to customer handset; waiting for M-Pesa PIN input.
* **`PAYMENT_FAILED`**: Safaricom reported `ResultCode !== 0` (e.g., 1032 user cancelled, 1037 timeout, 1 insufficient balance).
* **`PAYMENT_CONFIRMED`**: Webhook or STK Query confirmed Safaricom `ResultCode === 0`. M-Pesa receipt code stored in `payment_reference`.
* **`VENDING_PENDING`**: Payment secured; vending instruction dispatched to Kyanda.
* **`SUCCESS`**: Upstream provider confirmed delivery (`status === "0000"` or `category === "success"`). Delivery timestamp recorded.
* **`VENDING_FAILED_REFUND_PENDING`**: Provider rejected vending (e.g., out of float or telco network error). Funds are safely held; customer and admin receive immediate email alerts with transaction references for manual refund processing.

### 2.5 Dual-Phase Reconciliation Engine (`src/lib/services/reconciliation.ts`)

Run periodically via Vercel Cron (`GET /api/cron/reconcile` with `Bearer CRON_SECRET`), the reconciliation worker fixes transactions that missed real-time webhooks:

1. **Phase 1 — Payment Reconciliation**:
   * Queries all transactions in `PAYMENT_PENDING` older than 30 seconds (up to 6 hours old).
   * Calls Safaricom Daraja STK Query API (`/mpesa/stkpushquery/v1/query`).
   * If Daraja returns `ResultCode === "0"`: Transitions transaction to `VENDING_PENDING` and triggers `executeVendingForTransaction()` immediately.
   * If Daraja returns user cancellation (`1032`) or timeout (`1037`): Transitions to `PAYMENT_FAILED`.
2. **Phase 2 — Vending Reconciliation**:
   * Queries transactions in `VENDING_PENDING` older than 30 seconds.
   * Case A (Missing Kyanda Dispatch): If `kyanda_reference` is null, automatically dispatches `executeVendingForTransaction()` to ensure the order is fulfilled.
   * Case B (Pending Provider Check): If `kyanda_reference` is present, queries Kyanda's transaction-check endpoint (`/billing/v1/transaction-check`). Updates to `SUCCESS` or `VENDING_FAILED_REFUND_PENDING` based on Kyanda's response.

---

## 3. Key Integrations & Known Quirks / Gotchas

### 3.1 Safaricom M-Pesa Daraja API

* **Location in Code**: `src/lib/providers/mpesa/client.ts`, `src/lib/providers/mpesa/provider.ts`.
* **Quirks & Gotchas**:
  1. **OAuth Token Caching (CRITICAL)**: Safaricom applies aggressive rate limits on the `/oauth/v1/generate` endpoint. Generating a token on every request will cause `429 Too Many Requests`. The client caches the access token in module-level memory and only refreshes when within 60 seconds of expiration.
  2. **Webhook 308 Redirect Drop (CRITICAL)**:
     * Safaricom Daraja webhooks **DO NOT** follow HTTP 301 or 308 redirects.
     * Vercel automatically issues an HTTP 308 redirect from `https://qasinet.com` (non-www) to `https://www.qasinet.com` (www).
     * If the callback URL sent to Daraja is `https://qasinet.com/api/webhooks/mpesa`, Daraja drops the notification completely upon receiving the 308 response.
     * **Solution implemented**: `getCallbackUrl()` in `src/lib/providers/mpesa/provider.ts` explicitly rewrites `://qasinet.com` to `://www.qasinet.com`. `NEXT_PUBLIC_BASE_URL` in `.env.local` and Vercel must always be `https://www.qasinet.com`.
  3. **STK Password Generation**: Requires a base64 string composed of `Shortcode + Passkey + Timestamp`, where Timestamp must strictly follow the format `YYYYMMDDHHmmss`.

### 3.2 Kyanda Telecommunications API

* **Location in Code**: `src/lib/providers/kyanda/client.ts`, `src/lib/providers/kyanda/provider.ts`.
* **Quirks & Gotchas**:
  1. **Insufficient Float Error Codes (`1107` vs `4000`)**:
     * Kyanda's written documentation states insufficient balance returns status `1107`.
     * In live production, several endpoints return status code `4000` with message `"Insufficient account balance"`.
     * Both codes are normalized to `QasiNetErrorCode.INSUFFICIENT_FLOAT` in `src/lib/providers/kyanda/provider.ts`.
  2. **Deprecated Pay Bill API**:
     * Kyanda historically supported utility bill payments (Section B of their legacy manual).
     * These endpoints were decommissioned by Kyanda without backward compatibility. Do not attempt to use `/billing/v1/bill-pay` or KPLC channels.
  3. **Callback URL Sanitization**:
     * Similar to Safaricom, Kyanda callbacks fail on 308 redirects. `getSanitizedCallbackUrl()` ensures the callback always points to `https://www.qasinet.com/api/webhooks/kyanda`.

### 3.3 Resend Transactional Email

* **Location in Code**: `src/lib/email/client.ts`, `src/lib/services/email.ts`.
* **Quirks & Gotchas**:
  1. **Sandbox vs Custom Domain Verification**:
     * When using a sandbox API key or before a custom domain is verified in the Resend dashboard, Resend strictly allows outbound emails to the account owner's email address (`qasinetltd@gmail.com`). Attempts to email arbitrary customer addresses return HTTP 403 `validation_error`.
     * DNS records (DKIM, SPF, MX) for `qasinet.com` must be verified in Hosting.com DNS.
     * Until domain verification is confirmed active in Resend, setting `RESEND_FROM_EMAIL=QasiNet <noreply@qasinet.com>` will cause API rejections if Resend has not yet validated the DNS TXT records. Use `QasiNet <onboarding@resend.dev>` if domain status reverts to unverified.

### 3.4 Supabase Authentication & Admin Privileges

* **Location in Code**: `src/lib/auth.tsx`, `src/lib/auth/admin-check.ts`, `src/app/api/auth/register/route.ts`.
* **Quirks & Gotchas**:
  1. **Supabase SMTP Rate Limits on Customer Registration**:
     * Calling client-side `supabase.auth.signUp()` triggers Supabase's internal confirmation email. On standard Supabase projects, this hits an aggressive hourly email limit (`over_email_send_rate_limit`).
     * **Solution implemented**: Customer registration is handled server-side in `/api/auth/register` using `supabaseAdmin.auth.admin.createUser({ email_confirm: true })`. Customers are instantly registered, verified, and signed in with zero OTP delays.
  2. **Admin Two-Factor Authentication**:
     * Accounts associated with `qasinetltd.com` (or `qasinetltd@gmail.com`) are protected administrators.
     * Admin login requires a 6-digit OTP dispatched to `qasinetltd@gmail.com` via Resend before access to `/admin` is granted.

---

## 4. Known Limitations & Not Yet Automated

1. **Manual Refunds (No Automated Daraja B2C Reversal)**:
   * When a transaction enters `VENDING_FAILED_REFUND_PENDING`, the customer's money is safely recorded in the database, and an alert is sent to `qasinetltd@gmail.com`.
   * **Automated M-Pesa B2C refunds are not currently implemented.**
   * The administrator must manually send the refund via M-Pesa to the customer's phone number, then navigate to `/admin/transactions/[id]` and click **"Mark as Refunded"**.
2. **Bingwa Sokoni API Production Access**:
   * The integration code is complete, but cannot be enabled because the reseller has not provided production API credentials.
3. **Offline / PWA Queue Syncing**:
   * The app has a manifest (`manifest.webmanifest`) and basic offline detection (`src/lib/offline/queue.ts`), but background service worker queue replay is experimental and not recommended for production order placement. Customers should be online when checking out.

---

## 5. Testing Infrastructure

### 5.1 Automated Test Suite (`npm test`)

* **Runner**: Vitest v4.1.11.
* **Scope**: 22 test files covering over 215 tests:
  * Unit tests for validation schemas, phone formatting, float calculations, and state machine transitions.
  * Integration tests for Kyanda client response parsing, M-Pesa STK push payload formatting, and service locking logic.
  * Tests use mocked network requests and sandbox fixtures; **running `npm test` does not spend money**.

### 5.2 Live End-to-End Test Harness (`scripts/live-e2e/`)

* **WARNING**: The scripts in `scripts/live-e2e/` (such as `verify.mjs` and `balance.mjs`) connect to the **LIVE production Safaricom and Kyanda gateways**.
* **THEY SPEND REAL MONEY (KENYAN SHILLINGS).**
* **Strict Rules**:
  * **NEVER** run `scripts/live-e2e/` in CI/CD, GitHub Actions, or automated cron jobs.
  * Only execute manually with human oversight when testing live SIM delivery.
  * The script requires explicit `--phone` parameters and confirmation prompts before spending funds.

---

## 6. Deployment & Operations

### 6.1 Hosting & Domains

* **Application Host**: [Vercel](https://vercel.com/) linked to the `main` branch of `https://github.com/expertsocial/Qasinet.git`.
* **Canonical Production Domain**: `https://www.qasinet.com`.
* **DNS Provider**: Hosting.com DNS management.
  * Root `A` / `CNAME` records point to Vercel (`76.76.21.21` / `cname.vercel-dns.com`).
  * TXT records for Resend domain verification (`resend._domainkey.qasinet.com`).

### 6.2 Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

* Runs every 2 minutes.
* Automatically triggers `/api/cron/reconcile` to resolve any stuck payments or pending vending orders.

### 6.3 Troubleshooting & Operational Runbook

| Incident | Root Cause to Check | Action / Fix |
| :--- | :--- | :--- |
| **Transactions stuck in `PAYMENT_PENDING`** | Callback URL redirect or Daraja timeout. | 1. Ensure `NEXT_PUBLIC_BASE_URL` is `https://www.qasinet.com` (with `www`). 2. Manually trigger `/api/cron/reconcile` with `Bearer CRON_SECRET` to reconcile via STK query. |
| **Transactions stuck in `VENDING_PENDING`** | Kyanda callback drop or temporary upstream telco delay. | 1. Navigate to Admin Dashboard `/admin/transactions/[id]`. 2. Click "Check Status with Provider" or "Revend Transaction" to re-dispatch vending. |
| **Checkout blocks with "Float Insufficient"** | Kyanda merchant balance depleted below minimum buffer. | Log in to Kyanda Merchant Portal and top up merchant float wallet via M-Pesa Paybill. |
| **Customer cannot receive confirmation email** | Resend domain verification pending or unverified custom domain. | Check Resend Domains Dashboard. Verify DNS TXT records in Hosting.com DNS. |
| **Admin unable to log in** | OTP email not received. | Check Spam folder of `qasinetltd@gmail.com` or inspect Resend logs for delivery events. |
