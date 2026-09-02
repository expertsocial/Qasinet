Absolutely. Since you’ve decided to go back to **Kyanda**, I’d treat this as a **full QasiNet production specification**, not just an API integration. I checked Kyanda’s current site as well: it still presents its API, airtime, payments, utility billing, and Kenyan business services, and its published pricing currently lists commissions for Safaricom, Airtel, Telkom, Faiba, Equitel and TV services.

# **QASINET — COMPLETE WEBSITE MASTER SPECIFICATION**

## **1\. Core purpose**

**QasiNet** is a premium Kenyan digital-services marketplace where customers can purchase:

* Safaricom airtime  
* Airtel airtime  
* Telkom airtime  
* Equitel airtime  
* Faiba airtime  
* Data bundles  
* DStv  
* GOtv  
* Zuku  
* StarTimes  
* Kenya Power services  
* Nairobi Water, if enabled  
* Other Kyanda-supported utility services

The website should automatically process transactions through **Kyanda APIs**, while QasiNet controls its own customer-facing prices and tracks revenue/profit.

Kyanda currently describes its API as a business integration service and its Kenyan product offering includes airtime, utility billing and payment services.

---

# **2\. CUSTOMER EXPERIENCE**

## **Homepage**

The homepage should immediately communicate:

**QasiNet**

> **Your Digital Services. One Simple Platform.**

Primary actions:

* Buy Airtime  
* Buy Data  
* Pay TV  
* Pay Electricity  
* Other Services

### **Homepage sections**

1. Premium hero section  
2. Services grid  
3. How QasiNet works  
4. Why QasiNet  
5. Supported networks/services  
6. Secure payments  
7. Transaction tracking  
8. FAQ  
9. Contact/support  
10. Footer

---

# **3\. SERVICE-FIRST DESIGN**

This is important based on your client's decision.

**Visitors should NOT be forced to register before purchasing.**

The first thing they should see is:

QASINET

What would you like to do?

\[Airtime\]  
\[Data\]  
\[TV Subscription\]  
\[Electricity\]  
\[Other Bills\]

Registration/login should exist, but it should be **optional**.

### **Guest customer**

Can:

* Select service  
* Enter phone/account number  
* Select product  
* Pay  
* Receive transaction result  
* Receive receipt/reference

### **Registered customer**

Gets additional features:

* Dashboard  
* Transaction history  
* Saved beneficiaries  
* Saved phone numbers  
* Receipts  
* Profile  
* Notifications  
* Faster repeat purchases

---

# **4\. AIRTIME**

Create a premium Airtime page.

### **Networks**

* Safaricom  
* Airtel  
* Telkom  
* Equitel  
* Faiba

### **Form**

Network  
↓  
Phone Number  
↓  
Amount  
↓  
Customer pays  
↓  
Kyanda vending  
↓  
Confirmation

Kyanda currently advertises airtime API distribution across Kenyan networks and a reseller-oriented pricing structure. ([kyanda.co.ke](https://kyanda.co.ke/airtime?utm_source=chatgpt.com))

---

# **5\. DATA**

Create a dedicated Data page.

Customer selects:

* Network  
* Phone number  
* Bundle  
* Amount

The system should **not hard-code plans unnecessarily**.

Where the API/provider supports product retrieval, plans should come from the backend/provider configuration.

Example:

Safaricom

Daily  
Weekly  
Monthly  
Special Bundles

Then:

Customer price  
Provider cost  
QasiNet markup

The **provider cost must never be exposed to customers**.

---

# **6\. TV SUBSCRIPTIONS**

Create one unified TV page.

### **Providers**

* DStv  
* GOtv  
* Zuku  
* StarTimes

Kyanda's published business pricing currently explicitly lists **DSTV, GOTV, ZUKU and STARTIMES** under airtime/utility billing. ([kyanda.co.ke](https://kyanda.co.ke/business?utm_source=chatgpt.com))

### **Flow**

Select TV provider  
        ↓  
Enter Smartcard/IUC/account number  
        ↓  
Select package  
        ↓  
Enter customer phone  
        ↓  
Display amount  
        ↓  
Confirm  
        ↓  
Payment  
        ↓  
Kyanda vending  
        ↓  
Check transaction  
        ↓  
Success/Failure

Where account verification is supported, verify the account **before payment**.

---

# **7\. KENYA POWER**

Create:

**Pay Electricity**

Options:

* Prepaid  
* Postpaid

### **Prepaid**

Meter Number  
↓  
Amount  
↓  
Customer details  
↓  
Payment  
↓  
Kyanda  
↓  
Token

### **Postpaid**

Account Number  
↓  
Amount  
↓  
Payment  
↓  
Kyanda  
↓  
Confirmation

The resulting token/reference should be prominently displayed and also sent through the configured notification channel.

---

# **8\. PAYMENT SYSTEM**

QasiNet needs a dedicated payment engine.

The architecture should support:

Customer  
   ↓  
Payment  
   ↓  
Payment verification  
   ↓  
Only AFTER confirmed payment  
   ↓  
Vending request

**Never vend a service merely because the frontend says payment succeeded.**

The backend must verify payment independently.

---

# **9\. KYANDA INTEGRATION**

Keep all Kyanda credentials **server-side**.

Never expose:

* apiKey  
* security key  
* MerchantID secrets  
* webhook secrets

in frontend JavaScript.

Use environment variables.

Example architecture:

.env

KYANDA\_BASE\_URL=  
KYANDA\_API\_KEY=  
KYANDA\_MERCHANT\_ID=  
KYANDA\_SECURITY\_KEY=  
KYANDA\_CALLBACK\_URL=

The exact production base URL and credentials should come from your Kyanda merchant account/documentation rather than being invented by the application.

---

# **10\. KYANDA SECURITY**

Implement the HMAC SHA-256 signing mechanism exactly according to the Kyanda documentation you supplied.

Create a reusable backend utility:

generateKyandaSignature()

It should accept the required concatenated values and produce the HMAC SHA-256 signature.

Different endpoints use different concatenation orders.

For example:

MerchantID

for account balance.

And:

MerchantID \+ transactionRef

for transaction status.

Therefore **do not create one generic signature string and reuse it blindly**.

Create endpoint-specific signing functions.

---

# **11\. KYANDA ACCOUNT SYSTEM**

Admin should have:

### **Kyanda Account Balance**

Display:

* Account balance  
* Earnings balance  
* Last updated  
* Connection status

The supplied Kyanda documentation defines an account-balance endpoint that returns `Account_Bal` and `Earnings_Bal`.

Dashboard:

KYANDA

Available Float  
KES XXXXX

Earnings  
KES XXXXX

API Status  
● Connected  
---

# **12\. TRANSACTION ENGINE**

Every transaction needs an internal QasiNet transaction ID.

Example:

QSN-20260902-000001

Also store:

Kyanda Reference

### **Transaction lifecycle**

CREATED  
   ↓  
PAYMENT\_PENDING  
   ↓  
PAYMENT\_CONFIRMED  
   ↓  
VENDING\_PENDING  
   ↓  
SUCCESS

Possible failures:

PAYMENT\_FAILED  
VENDING\_FAILED  
REVERSED  
TIMEOUT  
UNKNOWN  
---

# **13\. VERY IMPORTANT — DO NOT TRUST "SUCCESS" BLINDLY**

This addresses the problem you experienced earlier.

If Kyanda returns:

status: Success

QasiNet should still maintain its own transaction state and reconciliation mechanism.

Implement:

### **Transaction verification**

Use the Kyanda transaction-check endpoint when appropriate.

Store:

* QasiNet transaction ID  
* Kyanda transaction reference  
* service  
* customer  
* amount  
* provider  
* request timestamp  
* response  
* final status  
* failure reason  
* receipt/reference

---

# **14\. WEBHOOK/CALLBACK SYSTEM**

Create:

/api/webhooks/kyanda

The callback system must:

1. Receive Kyanda notification  
2. Validate request  
3. Identify transaction  
4. Update transaction  
5. Prevent duplicate processing  
6. Record raw response  
7. Return HTTP 200 with the expected acknowledgement

Also implement **idempotency**.

If Kyanda sends the same callback three times:

Callback 1 → process  
Callback 2 → ignore duplicate  
Callback 3 → ignore duplicate  
---

# **15\. AUTOMATIC RECONCILIATION**

Create a background reconciliation process.

For transactions stuck in:

PENDING

the system periodically checks their status.

Example:

Pending transaction  
       ↓  
Wait  
       ↓  
Check Kyanda  
       ↓  
Success → complete  
Failed → fail/refund workflow  
Still pending → check later

This is extremely important for a vending business.

---

# **16\. PRICING ENGINE**

QasiNet should have its own pricing system.

Example:

Provider cost:      KES 980  
QasiNet markup:     KES 20  
Customer pays:      KES 1,000

Database should store:

provider\_cost  
selling\_price  
profit

Formula:

profit \= selling\_price \- provider\_cost

Do not calculate this only on the frontend.

---

# **17\. ADMIN DASHBOARD**

The admin dashboard should be extremely comprehensive.

### **Main dashboard**

Cards:

* Today's sales  
* Today's profit  
* Total transactions  
* Successful transactions  
* Failed transactions  
* Pending transactions  
* Kyanda balance  
* Kyanda earnings

Charts:

* Daily sales  
* Daily profit  
* Transaction volume  
* Service popularity

---

# **18\. TRANSACTION MANAGEMENT**

Admin can:

* Search transactions  
* Filter by service  
* Filter by status  
* Filter by date  
* Search phone number  
* Search account number  
* Search transaction ID  
* Search Kyanda reference  
* View complete transaction  
* Export transactions  
* Investigate failed transactions

---

# **19\. CUSTOMER MANAGEMENT**

Admin can see:

* Name  
* Phone  
* Email  
* Registration date  
* Number of transactions  
* Total spending  
* Account status

Admin actions:

* View customer  
* Suspend  
* Activate  
* Reset account  
* View transaction history

---

# **20\. CUSTOMER ACCOUNT**

Optional registration.

Dashboard:

Welcome back

Total purchases  
Total spent

Recent transactions

Saved numbers

Receipts  
---

# **21\. RECEIPTS**

Every successful transaction should generate a professional receipt.

Include:

**QasiNet**

* Transaction ID  
* Date  
* Service  
* Customer  
* Account/phone  
* Amount  
* Status  
* Provider reference  
* Payment reference

Buttons:

* Download receipt  
* Print  
* Share

---

# **22\. NOTIFICATIONS**

Implement notification infrastructure.

Potential channels:

* Website notification  
* Email  
* SMS  
* WhatsApp later

For example:

> Your DStv payment was successful.

Never send a "successful" notification until the transaction has actually been confirmed.

---

# **23\. GUEST TRANSACTION TRACKING**

Because registration isn't mandatory, guests need a way to track purchases.

After purchase:

Transaction successful

Reference:  
QSN-XXXXXXXX

\[Track Transaction\]

A customer can enter:

Transaction Reference  
\+  
Phone Number

to retrieve the status.

---

# **24\. LOGIN/REGISTRATION**

Optional but available.

### **Registration**

* Full name  
* Phone  
* Email  
* Password  
* OTP verification

### **Login**

* Email/phone  
* Password

### **Security**

* Password hashing  
* Rate limiting  
* Session management  
* OTP  
* Forgot password

---

# **25\. ADMIN SECURITY**

Admin must be completely separated from normal users.

Use:

/admin

with:

* Admin authentication  
* Role-based authorization  
* MFA/2FA  
* Session timeout  
* Login monitoring  
* Audit logs

Never rely on simply hiding the admin URL.

---

# **26\. ADMIN ROLES**

Eventually:

### **Super Admin**

Everything.

### **Operations Admin**

Transactions/customers.

### **Finance Admin**

Payments/reports/profits.

### **Support Admin**

Customer issues.

---

# **27\. AUDIT LOG**

Record sensitive actions:

Admin  
Action  
Timestamp  
IP  
Target  
Old value  
New value

Example:

> Admin changed DSTV markup from KES 20 to KES 30\.

---

# **28\. DARK/LIGHT MODE**

You've already requested this.

Implement:

**Light Mode**

and

**Dark Mode**

with a polished transition.

Remember the choice.

---

# **29\. PREMIUM 3D UI/UX**

QasiNet should look like a **professional fintech platform**, not a basic VTU template.

Use:

* Glassmorphism selectively  
* 3D service cards  
* Soft depth  
* Subtle gradients  
* Animated background elements  
* Premium icons  
* Micro-interactions  
* Smooth page transitions  
* Skeleton loading  
* Hover states  
* Animated transaction states  
* Modern typography  
* Responsive layouts

But don't overload the site with unnecessary 3D effects.

**Premium ≠ cluttered.**

---

# **30\. SERVICE ICONS/IMAGES**

Each service should have strong visual identity.

For example:

📱 Airtime  
📶 Data  
📺 TV  
⚡ Electricity  
💧 Water

You can use official logos where legally appropriate, otherwise use clean service illustrations/icons.

---

# **31\. MOBILE-FIRST**

A large percentage of customers will access QasiNet through phones.

Therefore:

Mobile  
↓  
Tablet  
↓  
Desktop

should be the design priority.

Forms should be extremely easy to complete on mobile.

---

# **32\. ERROR HANDLING**

Never show:

> "Something went wrong."

Instead:

> **We couldn't complete your request**

Then:

> Your payment was received, but the service provider hasn't confirmed the vending yet. We're checking automatically.

And provide:

**Transaction ID: QSN-XXXX**

This is much more professional.

---

# **33\. FAILED TRANSACTION PROTECTION**

Critical rule:

### **Never charge the customer twice.**

Implement:

* Idempotency keys  
* Duplicate transaction detection  
* Unique transaction references  
* Payment verification  
* Vending locks  
* Retry limits

Example:

Customer clicks Pay  
       ↓  
Request created  
       ↓  
Button disabled  
       ↓  
Payment processed  
       ↓  
Vending initiated once  
---

# **34\. WALLET — OPTIONAL FUTURE FEATURE**

You can eventually introduce customer wallets.

But don't make it mandatory for the first version.

Wallet features:

* Deposit  
* Balance  
* Purchase  
* Transaction history  
* Refund  
* Admin adjustment

---

# **35\. REPORTING**

Admin reports:

### **Sales**

* Daily  
* Weekly  
* Monthly  
* Custom date range

### **Profit**

* Gross revenue  
* Provider cost  
* Gross profit

### **Services**

* Airtime  
* Data  
* DStv  
* GOtv  
* Zuku  
* StarTimes  
* KPLC

Export:

* CSV  
* Excel  
* PDF

---

# **36\. SETTINGS**

Admin settings should include:

### **General**

* Site name  
* Logo  
* Favicon  
* Contact details  
* Currency  
* Timezone

### **Pricing**

* Markups  
* Service activation/deactivation  
* Minimum/maximum transaction

### **Payments**

* Payment credentials  
* Callback URL  
* Payment settings

### **Kyanda**

* API URL  
* API key  
* Merchant ID  
* Security key  
* Callback URL  
* Connection test

### **Notifications**

* Email  
* SMS  
* WhatsApp later

---

# **37\. KYANDA CONNECTION TEST**

Admin should have:

**Test Kyanda Connection**

Result:

✓ API reachable  
✓ Authentication successful  
✓ Merchant verified  
✓ Balance retrieved

or:

✕ Authentication failed

Never display secret keys in the UI after saving.

---

# **38\. SECURITY ARCHITECTURE**

Implement:

* HTTPS  
* Environment secrets  
* Server-side API calls  
* Input validation  
* Rate limiting  
* CSRF protection where applicable  
* Secure cookies  
* Authentication  
* Authorization  
* Database RLS  
* Audit logs  
* API timeout handling  
* Retry strategy  
* Webhook validation  
* Idempotency  
* Error logging

---

# **39\. DATABASE**

Recommended core tables:

users  
profiles  
admins  
services  
service\_providers  
products  
pricing  
transactions  
transaction\_events  
payments  
kyanda\_transactions  
webhook\_events  
receipts  
notifications  
saved\_beneficiaries  
audit\_logs  
system\_settings  
---

# **40\. TECHNICAL ARCHITECTURE**

Based on the architecture you've been using:

Next.js  
React  
TypeScript  
Tailwind  
Supabase

Backend:

Next.js Server/API Routes  
        ↓  
QasiNet Service Layer  
        ↓  
Kyanda API

Do **not** allow:

Browser → Kyanda

Instead:

Browser  
   ↓  
QasiNet Backend  
   ↓  
Kyanda  
---

# **41\. PROVIDER ABSTRACTION**

Even though you're returning to Kyanda, build this properly.

Create:

VendingProvider

Then:

KyandaProvider

So later you can add:

ProTaxProvider  
AnotherProvider

without rebuilding QasiNet.

---

# **42\. CUSTOMER PURCHASE FLOW**

The ideal complete flow is:

CUSTOMER  
   ↓  
Select Service  
   ↓  
Enter Details  
   ↓  
Validate Details  
   ↓  
Select Product  
   ↓  
Calculate QasiNet Price  
   ↓  
Review Order  
   ↓  
Payment  
   ↓  
Payment Verification  
   ↓  
Create Vending Transaction  
   ↓  
Kyanda API  
   ↓  
Kyanda Response  
   ↓  
Webhook / Transaction Check  
   ↓  
FINAL STATUS  
   ↓  
Receipt  
   ↓  
Customer Notification  
---

# **43\. ADMIN TRANSACTION FLOW**

Admin sees:

Customer  
    ↓  
Payment  
    ↓  
Vending  
    ↓  
Provider  
    ↓  
Status  
    ↓  
Profit

Everything should be traceable.

---

# **44\. LEGAL/PUBLIC PAGES**

QasiNet should have:

* About  
* Contact  
* FAQ  
* Terms & Conditions  
* Privacy Policy  
* Refund Policy  
* Service Terms  
* Payment Policy

---

# **45\. SUPPORT**

Create:

**Help Center**

with:

* Failed payment  
* Pending transaction  
* Wrong number  
* TV subscription issue  
* Electricity token issue  
* Refund request  
* General support

Each support ticket should reference the transaction ID.

---

# **46\. FINAL PRODUCTION CHECK**

Before launch, test:

### **Payments**

* Successful payment  
* Failed payment  
* Cancelled payment  
* Timeout  
* Duplicate payment

### **Kyanda**

* Authentication  
* Balance  
* Airtime  
* Data  
* DStv  
* GOtv  
* Zuku  
* StarTimes  
* KPLC  
* Transaction status  
* Callback

### **Security**

* Guest access  
* User access  
* Admin access  
* API secrets  
* RLS  
* Rate limiting  
* Duplicate requests

### **UI**

* Mobile  
* Tablet  
* Desktop  
* Dark mode  
* Light mode  
* Loading states  
* Errors  
* Empty states

---

# **47\. THE MOST IMPORTANT RULE FOR THIS PROJECT**

Given what happened previously with Kyanda, I would make this a **hard requirement**:

> **QasiNet must never consider a transaction completed solely because the initial API request returned HTTP 200 or a generic "Success" response.**

The system must have a proper **transaction state machine \+ Kyanda callback \+ transaction-status verification \+ reconciliation process**.

That is the part that will prevent the "website says successful but the customer never received the service" problem.

Kyanda's current website still presents its API as an integration product and its business offering includes utility/airtime services in Kenya, so we're not abandoning the provider; we're simply building the integration much more defensively this time.

## **Final QasiNet structure**

                        QASINET  
                            │  
       ┌────────────────────┼────────────────────┐  
       │                    │                    │  
   CUSTOMER UI          PAYMENT ENGINE       ADMIN PANEL  
       │                    │                    │  
       │                    ↓                    │  
       │              PAYMENT VERIFY             │  
       │                    │                    │  
       └────────────────────┼────────────────────┘  
                            ↓  
                    QASINET SERVICE  
                         ENGINE  
                            │  
                     PROVIDER ROUTER  
                            │  
                       KYANDA API  
                            │  
        ┌──────────┬────────┼──────────┬─────────┐  
        ↓          ↓        ↓          ↓         ↓  
     Airtime     Data      TV         KPLC     Water  
                           │  
                    ┌──────┼──────┐  
                    ↓      ↓      ↓  
                  DStv    GOtv   Zuku  
                           \+  
                       StarTimes

                            ↓  
                   CALLBACK / STATUS  
                            ↓  
                   RECONCILIATION  
                            ↓  
                   FINAL TRANSACTION  
                            ↓  
                  RECEIPT \+ NOTIFICATION

**This should be the master blueprint we use before writing the next line of integration code.** It keeps the visitor-first purchasing experience your client approved, while making registration, administration, payments, Kyanda vending, profit tracking, security, and transaction reconciliation all first-class parts of QasiNet.

