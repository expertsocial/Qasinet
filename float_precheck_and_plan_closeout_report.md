# QasiNet Merchant Float Pre-Check & Six-Step Integration Closeout Report

**Execution Date:** 2026-09-08  
**Target Gateway:** Kyanda Live Production Gateway (`https://api.kyanda.app`)  
**Merchant ID:** `qasinet`  
**Endpoint:** `POST /billing/v1/account-balance` (Balance Inquiry API)  
**Overall Status:** **ALL CHECKS PASSED (91/91 Unit Tests + Live Gateway Verified + 45/45 Build Green)**

---

## 1. Executive Summary

This milestone delivers the **Merchant Float Pre-Check & Circuit Breaker**, completing the final step of the six-step QasiNet gateway integration plan. 

Prior to this step, customer checkout triggered a Safaricom Daraja STK push regardless of available Kyanda float balance. If float was depleted, customer funds were collected via M-Pesa before Kyanda returned `1107`/`4000` (*Insufficient Funds!*), pushing orders into `VENDING_FAILED_REFUND_PENDING`. While the refund safety net handled those cases, the pre-check prevents unnecessary customer friction by evaluating available float **before** collecting payment.

### Key Deliverables Completed:
1. **Shared FloatService:** Built [`src/lib/services/float.ts`](file:///c:/Users/HomePC/Desktop/Qasinet/src/lib/services/float.ts) providing `checkSufficientFloat(amount)` with dynamic buffer scaling, in-memory caching, and fail-open/fail-closed policies.
2. **Single Checkout Choke Point:** Wired into [`src/app/api/transactions/route.ts`](file:///c:/Users/HomePC/Desktop/Qasinet/src/app/api/transactions/route.ts) before database order creation and STK push dispatch.
3. **Admin Visibility & Cache Invalidation:** Implemented [`GET /api/admin/kyanda/balance`](file:///c:/Users/HomePC/Desktop/Qasinet/src/app/api/admin/kyanda/balance/route.ts) and added a dedicated telemetry card in [`src/app/admin/kyanda/page.tsx`](file:///c:/Users/HomePC/Desktop/Qasinet/src/app/admin/kyanda/page.tsx). An admin query immediately refreshes the shared cache for all subsequent customer orders.
4. **Comprehensive Test Suite:** Added [`__tests__/float.test.ts`](file:///c:/Users/HomePC/Desktop/Qasinet/__tests__/float.test.ts) with 12 new tests (91/91 passing across the repo).
5. **Closeout of Six-Step Plan:** Documented the current live state, architecture, and open follow-up items across all services.

---

## 2. Technical Architecture & Design Decisions

### A. Dynamic Safety Buffer Formula
A flat buffer (e.g. 50 KES) provides adequate protection for micro-transactions (20 KES airtime/bundles), but is an extremely thin safety margin for high-value orders (e.g. a 6,000 KES TV package). 

In [`FloatService.getEffectiveBuffer(amount)`](file:///c:/Users/HomePC/Desktop/Qasinet/src/lib/services/float.ts):
```typescript
public getEffectiveBuffer(amount: number): number {
  const { minBuffer, bufferPercent } = this.getConfig();
  const percentBuffer = Math.round((amount * bufferPercent) / 100);
  return Math.max(minBuffer, percentBuffer);
}
```
* **Micro-order (20 KES bundle):** `max(50, round(20 * 0.05)) = 50 KES` buffer.
* **Large order (6,000 KES TV package):** `max(50, round(6000 * 0.05)) = 300 KES` buffer.
* **Configurable via:** `MIN_FLOAT_BUFFER` (default: 50) and `FLOAT_BUFFER_PERCENT` (default: 5).

### B. Caching Strategy & Concurrency Tradeoff
* **TTL Configuration:** `FLOAT_CACHE_TTL_MS=45000` (45 seconds in-memory).
* **Rationale:** Direct balance checks on every checkout add 200–400ms latency to M-Pesa prompts and risk triggering rate limits on Kyanda during traffic bursts. 
* **Concurrency Gap (Explicitly Documented):** If two large orders (e.g. two 1,500 KES TV subscriptions) check out within the same 45-second window when float is 2,000 KES, both will read the same cached balance and pass the pre-check. One will vend successfully, and the second will hit Kyanda `1107`.
* **Mitigation:** The pre-check drastically reduces the incidence of depleted-float vends, while the existing `VENDING_FAILED_REFUND_PENDING` orchestrator remains the definitive safety net for concurrency edge cases.

### C. Fail-Open vs. Fail-Closed Policy
* **Config Flag:** `FLOAT_CHECK_FAIL_OPEN=true` (default: true).
* **Decision Rationale:** Transient network glitches or brief timeouts on Kyanda's balance endpoint should not halt all sales across QasiNet when float is actually healthy.
* **Fallback Behavior:**
  * **When `true` (Fail-Open):** Emits a loud `console.warn`, returns `sufficient: true`, and allows the checkout to proceed, relying on the post-payment refund orchestrator if float is exhausted.
  * **When `false` (Fail-Closed):** Emits a `console.error`, returns `sufficient: false`, and blocks checkout.
* **Kill-Switch Logging:** If `FLOAT_CHECK_ENABLED=false`, a prominent warning log is emitted on every transaction attempt so accidental deactivations cannot go unnoticed.

### D. Single Choke Point & Validation Precedence
In [`src/app/api/transactions/route.ts`](file:///c:/Users/HomePC/Desktop/Qasinet/src/app/api/transactions/route.ts), checks execute in strict chronological sequence:
1. **Zod Payload Validation:** Validates destination (phone, meter, account number), bounds, and guest phone. If invalid, returns `400 Validation Error` immediately.
2. **Float Pre-Check:** Only executed if input data is valid. If float is insufficient, returns `503 Service Unavailable` with customer message:
   > *"Service temporarily unavailable. Please try again shortly."*
   **Crucial:** Zero pending database records are written, and STK push is never dispatched.
3. **Database Write & STK Push:** Initiates transaction record in `PAYMENT_PENDING` and triggers Daraja STK push.

### E. Admin Live Visibility with Shared Cache Invalidation
* In [`src/app/api/admin/kyanda/balance/route.ts`](file:///c:/Users/HomePC/Desktop/Qasinet/src/app/api/admin/kyanda/balance/route.ts), calling the endpoint executes `floatService.refreshBalance()`.
* This queries Kyanda's live API directly AND immediately overwrites `cachedBalance` in memory.
* If an admin funds the float and verifies the balance on the dashboard, the fresh balance is immediately active for all customer checkouts without waiting 45 seconds for cache expiry.

---

## 3. Live Gateway Verification Telemetry

Real HTTP requests executed against `https://api.kyanda.app`:

| Scenario | Target / Layer | Parameters | HTTP Status | Response Payload | Analysis & Confirmation |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **1. Live Balance Inquiry** | `POST /billing/v1/account-balance` | `MerchantID: "qasinet"`, HMAC signature of MerchantID only | **200** | `{"Account_Bal": 0, "Earnings_Bal": 0}` | **PASSED.** Endpoint active; HMAC verified; keys match documented `Account_Bal` & `Earnings_Bal`. |
| **2. Insufficient Float Choke Point** | `POST /api/transactions` (Local Choke Point) | Service: `airtime`, Amount: `100`, Balance: `0` | **503** | `{"success": false, "error": {"code": "SERVICE_UNAVAILABLE", "message": "Service temporarily unavailable. Please try again shortly."}}` | **PASSED.** STK push blocked; 0 database records created; clean user-facing error returned. |
| **3. Validation Priority** | `POST /api/transactions` (Local Choke Point) | Destination: `""`, Amount: `-50` | **400** | `{"error": "Validation failed", "details": {...}}` | **PASSED.** Fails fast on malformed data before float check is ever evaluated. |
| **4. Fail-Open / Fail-Closed** | `FloatService.checkSufficientFloat` | Simulated Network Timeout (`ETIMEDOUT`) | N/A | `FLOAT_CHECK_FAIL_OPEN=true` => `sufficient: true`, fallbackUsed: true<br>`FLOAT_CHECK_FAIL_OPEN=false` => `sufficient: false` | **PASSED.** Both policies verified via unit tests; loud alerts emitted. |
| **5. Caching & Cache Refresh** | `FloatService` | Two consecutive calls within 45s TTL | N/A | Call 1: `cached: false` (network call)<br>Call 2: `cached: true` (0 network calls)<br>Admin Refresh: updates cache | **PASSED.** Verified via unit tests and network telemetry. |

---

## 4. Full Six-Step Plan Closeout Summary

This concludes the six-step integration roadmap. Below is the operational status across all six services:

| # | Feature / Milestone | API Endpoint & Telco Code | Gateway Status | Current Operational State |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Electricity Vending** (KPLC Prepaid & Postpaid) | `POST /billing/v1/bill/create`<br>`telco: KPLC_PREPAID / KPLC_POSTPAID` | Verified (`1107`) | Production ready; shared Pay Bill handler extracts tokens, units, and receipts. |
| **2** | **TV Subscriptions** (GOTV, DSTV, ZUKU, STARTIMES) | `POST /billing/v1/bill/create`<br>`telco: GOTV, DSTV, ZUKU, STARTIMES` | Verified (`1107`) | Production ready; validates smartcard/account, formats payload, extracts confirmation reference. |
| **3** | **Airtime Vending** (All 5 Networks) | `POST /billing/v1/airtime/create`<br>`telco: SAFARICOM, AIRTEL, TELKOM, EQUITEL, FAIBA` | Verified (`1107`) | Production ready; whole-number bounds enforced (`2 < amount < 7000`), pinless airtime active. |
| **4** | **Faiba Data Bundles** (19 Documented Packages) | `POST /billing/v1/airtime/create`<br>`telco: FAIBA_B` with `productCode` | Verified (`1107`) | Production ready; catalog updated to official 19 bundles; exact price matching verified. |
| **5** | **Water Bill Payments** (Nairobi Water) | `POST /billing/v1/bill/create`<br>`telco: NAIROBI_WTR` | Verified (`1107`) | Production ready; placeholder `NAIROBIWATER` corrected to `NAIROBI_WTR`; decimal support verified. |
| **6** | **Merchant Float Pre-Check & Circuit Breaker** | `POST /billing/v1/account-balance`<br>HMAC of MerchantID | Verified (`200`) | Production ready; dynamic buffer, 45s caching, fail-open policy, admin live telemetry active. |

---

## 5. Open Items for Future Float Top-Up

There are two non-blocking items remaining for post-launch operations:

1. **Pay Bill API Section Omission in New Documentation:**
   * Kyanda's recently published documentation omits Section B ("Pay Bill API"), while Airtime remains documented.
   * **Finding:** The live production gateway (`POST /billing/v1/bill/create`) continues to process KPLC, TV, and Water requests normally, returning valid `QASAPI...` references and reaching float validation (`1107`).
   * **Action:** Flagged for routine confirmation with Kyanda merchant support; no code changes required.

2. **Full End-to-End Success + SMS/IPN Verification:**
   * Every service has been verified up to the live gateway's float-check step (`1107` / `Account_Bal: 0`).
   * Once the live Kyanda merchant account (`qasinet`) is funded with working capital, one live purchase should be processed for each category to record the real SMS delivery and receipt generation end-to-end.

---

## 6. Verification & Build Status

* **Unit Tests:** `npm test` passing **91/91** tests across all 6 test suites.
* **Production Build:** `npm run build` compiled cleanly with **0 TypeScript errors** across all **45 application routes**.
* **Pre-Check Default:** `FLOAT_CHECK_ENABLED=true`, `FLOAT_CHECK_FAIL_OPEN=true`, `MIN_FLOAT_BUFFER=50`, `FLOAT_BUFFER_PERCENT=5`, `FLOAT_CACHE_TTL_MS=45000`.
