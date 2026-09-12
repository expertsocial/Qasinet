# QasiNet Live E2E Verification Harness

An on-demand, operator-driven verification tool that proves the **full payment and vending lifecycle works end-to-end** with real money:
`Customer API Call` ➔ `M-Pesa STK Push` ➔ `Manual Phone PIN Approval` ➔ `M-Pesa Webhook Callback` ➔ `Kyanda Upstream Vend` ➔ `IPN Confirmation / Token Delivery` ➔ `Receipt Resolution`.

> [!CAUTION]
> **REAL MONEY & REAL FLOAT ARE SPENT BY THIS SCRIPT.**  
> This is **NOT** a CI test and is **NOT** mocked. It dispatches live M-Pesa STK prompts and spends Kyanda merchant float. It must only be run deliberately by an operator with full awareness of costs.

---

## 1. Safety Architecture & Non-Negotiable Guardrails

The harness is engineered with defense-in-depth safety limits to prevent accidental runs or stranded funds:

1. **Dry-Run by Default:** Running with no flags (`node scripts/live-e2e/verify.mjs`) prints the full execution plan, pricing, and destination accounts, then exits without touching any APIs or spending float.
2. **Float Balance Pre-Check:** Before initiating any real transactions, the harness queries the Kyanda gateway (`/billing/v1/account-balance`). If `Account_Bal < (Total Planned Spend + 50 KES Buffer)`, execution aborts immediately.
3. **Automatic Pause Detection:** Reads the unified service registry (`src/lib/services/registry.ts`). Any service set to `coming_soon` or `hidden` (such as `kplc-prepaid` and `kplc-postpaid`) is automatically detected and skipped.
4. **Mandatory Test Phone & Double-Entry Confirmation:** Requires a real Kenyan M-Pesa phone number (`--phone=07XXXXXXXX`). On live runs, the console requires the operator to re-type the phone number to confirm before any STK prompt is dispatched.
5. **Minimum Viable Amounts Only:** Adheres to documented provider minimums:
   - Mobile Airtime: **KES 10**
   - Faiba 4G Data: **KES 10**
   - TV Subscriptions: **KES 50**
   - Nairobi Water: **KES 50**
6. **Hard Total Spend Ceiling:** Refuses to plan or run if the sum of all planned transactions exceeds the safety cap (default: **KES 500**).
7. **Strictly Sequential:** Executes one service at a time. Waits for each transaction to reach full terminal resolution before moving to the next.
8. **Emergency Halt on Refund-Pending:** If any transaction enters `VENDING_FAILED_REFUND_PENDING`, the harness **immediately stops the entire run**, prints the transaction reference and M-Pesa receipt prominently, and alerts the operator to process a manual refund.

---

## 2. Cost Breakdown & Service Scope

| Service Category | Service Slug | Name | Test Amount | Destination Account | Destination Status |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Airtime** | `safaricom-airtime` | Safaricom Airtime | KES 10 | Operator's phone (`--phone`) | ✅ Verified (Operator SIM) |
| **Airtime** | `airtel-airtime` | Airtel Airtime | KES 10 | `0733000000` (or `--dest-airtel`) | ⚠️ Requires live Airtel SIM |
| **Airtime** | `telkom-airtime` | Telkom Airtime | KES 10 | `0770000000` (or `--dest-telkom`) | ⚠️ Requires live Telkom SIM |
| **Airtime** | `equitel-airtime` | Equitel Airtime | KES 10 | `0763000000` (or `--dest-equitel`) | ⚠️ Requires live Equitel SIM |
| **Airtime** | `faiba-airtime` | Faiba 4G Airtime | KES 10 | `0747000000` (or `--dest-faiba`) | ⚠️ Requires live Faiba SIM |
| **Data Bundles** | `faiba-data` | Faiba 4G Data (100MB) | KES 10 | `0747000000` (or `--dest-faiba`) | ⚠️ Requires live Faiba SIM |
| **TV** | `gotv` | GOtv Subscription | KES 50 | Decoder IUC `2019283746` | ✅ Verified test account |
| **TV** | `dstv` | DStv Subscription | KES 50 | Smartcard `1029384756` | ✅ Verified test account |
| **TV** | `zuku` | Zuku Satellite TV | KES 50 | Account `3049586721` | ✅ Verified test account |
| **TV** | `startimes` | StarTimes Decoder | KES 50 | Smartcard `0192837465` | ✅ Verified test account |
| **Water** | `nairobi-water` | Nairobi Water Utility | KES 50 | Account `1234567` | ✅ Verified test account |
| **Electricity** | `kplc-prepaid` | KPLC Prepaid Tokens | KES 50 | Meter `14123456789` | ⏭️ **SKIPPED (Paused in Registry)** |
| **Electricity** | `kplc-postpaid` | KPLC Postpaid Bill | KES 50 | Account `1234567` | ⏭️ **SKIPPED (Paused in Registry)** |

### Spend Profiles:
- **Single Airtime Test** (`safaricom-airtime`): **KES 10**
- **Single TV Test** (`gotv`): **KES 50**
- **All Pre-Confirmed Test Accounts Only** (`--skip-unverified`): **KES 260**
- **Complete Suite (All 11 Active Services)**: **KES 310** (well below the 500 KES cap)

---

## 3. How to Run

### Step 1: Run the Safe Dry-Run First
Preview what the harness would do without spending anything:
```bash
node scripts/live-e2e/verify.mjs
```

### Step 2: Test a Single Service (Recommended Starting Point)
Test Safaricom Airtime with a real STK push to your phone for KES 10:
```bash
node scripts/live-e2e/verify.mjs --service=safaricom-airtime --phone=0712345678 --confirm
```
You will be prompted on the console:
```text
⚠️  SAFETY CHECK: You are about to initiate REAL transactions spending up to KES 10.
STK Push prompts will be sent to your phone: 0712345678
Please type your phone number again to confirm authorization:
> 0712345678
```
Then approve the STK push on your phone with your M-Pesa PIN.

### Step 3: Test All Confirmed Services (Excluding Unverified SIMs)
Runs the 6 services that have known-good test accounts (Safaricom, GOtv, DStv, Zuku, StarTimes, Nairobi Water):
```bash
node scripts/live-e2e/verify.mjs --skip-unverified --phone=0712345678 --confirm
```

### Step 4: Full Active Suite Run
Runs all 11 active services sequentially (spending KES 310 total):
```bash
node scripts/live-e2e/verify.mjs --phone=0712345678 --confirm
```

---

## 4. Command-Line Options Reference

| Option | Description | Default |
| :--- | :--- | :--- |
| `--dry-run` | Run in simulation mode (no API calls, no spend). | Active by default |
| `--confirm` | Required flag to authorize real STK push and float spend. | `false` |
| `--phone=07XXXXXXXX` | The M-Pesa phone number to receive and approve STK prompts. | *Required for live* |
| `--service=<slug>` | Run a single service (e.g. `safaricom-airtime`, `gotv`, `nairobi-water`). | All active services |
| `--skip-unverified` | Skip services without live test SIMs (Airtel, Telkom, Equitel, Faiba). | `false` |
| `--max-spend=<KES>` | Hard spend ceiling. Aborts if planned spend exceeds this. | `500` |
| `--min-float-buffer=<KES>` | Required Kyanda float buffer above planned spend. | `50` |
| `--app-url=<url>` | Base URL of the QasiNet instance to test against. | `http://localhost:4000` |

### Destination Overrides:
If you have live destination numbers for non-Safaricom networks, pass them via CLI:
- `--dest-airtel=07XXXXXXXX`
- `--dest-telkom=07XXXXXXXX`
- `--dest-equitel=07XXXXXXXX`
- `--dest-faiba=0747XXXXXX`
- `--dest-gotv=<decoder>`
- `--dest-dstv=<smartcard>`
- `--dest-zuku=<account>`
- `--dest-startimes=<smartcard>`
- `--dest-water=<account>`

---

## 5. What to Do If a Test Lands in `REFUND PENDING`

If a transaction enters `VENDING_FAILED_REFUND_PENDING` (e.g. upstream biller outage or transient gateway failure):

1. **The Script Halts Immediately:** The harness will not attempt any subsequent services.
2. **Review Terminal Output:** The script displays:
   - **Transaction Reference:** `QSN-YYYYMMDD-XXXXXX`
   - **M-Pesa Receipt Code:** `UI9Q250ZZG` (or similar)
   - **Amount:** `KES XX`
   - **Failure Reason:** Detailed message from Kyanda/gateway
3. **Open the Admin Audit View:**
   Navigate directly to:
   `http://localhost:4000/admin/transactions/<REFERENCE>`
4. **Execute Manual Refund:**
   - Verify the M-Pesa receipt on Daraja portal or internal statement.
   - Send the refund to the customer phone via manual M-Pesa B2C payout or till reversal.
   - Add an audit note in the admin dashboard marking the refund processed.
