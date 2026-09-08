**Merchant API**

# Kyanda API reference Updated 3 Sep 2026

Move money, vend airtime, and sell data bundles with one JSON contract. Every request uses the same header and the same HMAC field order.

### Get your keys

MerchantID and API key live in the [merchant portal](https://business.kyanda.app/login). The API key is also the security key.

### Sign the string

Concatenate fields in the documented order. No commas, no JSON. HMAC-SHA256 with the API key. Put the hex digest in signature.

### POST, then listen

You get a reference immediately. Final state arrives on your callback. Poll transaction status if you need a second look.

| Environment | Base URL |
| :---- | :---- |
| Sandbox | http://sandbox.kyanda.io:3030 |
| Live | Find the Live API Endpoint in the [merchant portal](https://business.kyanda.app/login). Paths stay the same as sandbox. |

## Quickstart

* Sign in at [business.kyanda.app](https://business.kyanda.app/login) and copy MerchantID plus API key (security key).  
* Build the HMAC string for the endpoint. Order is strict. Do not insert separators.  
* POST JSON with Content-Type: application/json and apiKey: {your API key}.  
* Store merchant\_reference / transactionId. Wait for the callback, or check status.  
* ***cURL***

*\# Account balance signs only MerchantID*  
*\# echo \-n "kyanda" | openssl dgst \-sha256 \-hmac "YOUR\_API\_KEY"*

curl \-X POST "http://sandbox.kyanda.io:3030/billing/v1/account-balance" \\  
  \-H "Content-Type: application/json" \\  
  \-H "apiKey: YOUR\_API\_KEY" \\  
  \-d '{  
    "MerchantID": "kyanda",  
    "signature": "HEX\_HMAC\_OF\_MerchantID"  
  }' 

***Node.js***  
const crypto \= require("crypto");  
function sign(payload, apiKey) {  
  return crypto.createHmac("sha256", apiKey).update(payload).digest("hex");  
}  
const merchantId \= "kyanda";  
const apiKey \= process.env.KYANDA\_API\_KEY;  
const signature \= sign(merchantId, apiKey);  
await fetch("http://sandbox.kyanda.io:3030/billing/v1/account-balance", {  
  method: "POST",  
  headers: { "Content-Type": "application/json", apiKey },  
  body: JSON.stringify({ MerchantID: merchantId, signature }),  
}); 

***Python.***  
import hashlib, hmac, json, os, urllib.request  
api\_key \= os.environ\["KYANDA\_API\_KEY"\]  
merchant\_id \= "kyanda"  
signature \= hmac.new(api\_key.encode(), merchant\_id.encode(), hashlib.sha256).hexdigest()  
req \= urllib.request.Request(  
    "http://sandbox.kyanda.io:3030/billing/v1/account-balance",  
    data=json.dumps({"MerchantID": merchant\_id, "signature": signature}).encode(),  
    headers={"Content-Type": "application/json", "apiKey": api\_key},  
    method="POST",  
)  
print(urllib.request.urlopen(req).read().decode()) 

***PHP***  
\<?php  
$apiKey \= getenv("KYANDA\_API\_KEY");  
$merchantId \= "kyanda";  
$signature \= hash\_hmac("sha256", $merchantId, $apiKey);  
$ch \= curl\_init("http://sandbox.kyanda.io:3030/billing/v1/account-balance");  
curl\_setopt\_array($ch, \[  
  CURLOPT\_POST \=\> true,  
  CURLOPT\_HTTPHEADER \=\> \["Content-Type: application/json", "apiKey: {$apiKey}"\],  
  CURLOPT\_POSTFIELDS \=\> json\_encode(\["MerchantID" \=\> $merchantId, "signature" \=\> $signature\]),  
  CURLOPT\_RETURNTRANSFER \=\> true,  
\]);  
echo curl\_exec($ch);   
***JAVA***  
String apiKey \= System.getenv("KYANDA\_API\_KEY");  
String merchantId \= "kyanda";  
Mac mac \= Mac.getInstance("HmacSHA256");  
mac.init(new SecretKeySpec(apiKey.getBytes(StandardCharsets.UTF\_8), "HmacSHA256"));  
String hex \= java.util.HexFormat.of().formatHex(  
    mac.doFinal(merchantId.getBytes(StandardCharsets.UTF\_8))); 

## Authentication

There is one secret. In the portal it may be labelled **API key** or **security key** — same value. Send it as the apiKey header and use it as the HMAC secret.

| Header | Value |
| :---- | :---- |
| Content-Type | application/json |
| apiKey | Your API key / security key. |

### How the signature is built

We do not sign the JSON object. We sign a flat string of selected field values, glued in a fixed order. Spaces inside a name stay. Nothing else is inserted.

**1\. Fields**  
amount \= 100, phone \= 0715330000, telco \= SAFARICOM, initiatorPhone \= 0715330000, MerchantID \= kyanda  
**2\. Concat**  
1000715330000SAFARICOM0715330000kyanda  
**3\. HMAC**  
HMAC-SHA256(concat, apiKey) → lowercase hex → signature  
Never include signature in the string you sign. For data bundles, productCode is in the JSON body and is **not** in the HMAC. Amounts are whole Kenya Shillings — no cents, no commas.

## Signature lab

Generate a real HMAC with the same field order the API uses. Optionally fire the request at sandbox.

### Generator and sandbox tester

Runs in your browser. Keys are not stored.

Use sandbox credentials only. Do not paste a live API key, live MerchantID, or production endpoint here.  
Endpoint  
                                     Account balance                                     Transaction status                                     Telco prefix                                     Airtime                                     Data bundles                                     Mobile checkout                                     Mobile wallet payout                                     Bank payout                                     Callback URL                                   
Sandbox API key / security key  
MerchantID

POST /billing/v1/account-balance

Concatenated string: kyanda  
Generate signatureSend to sandboxCopy output  
Add a sandbox API key first. Do not paste a live key.

## Account

### Account balance

Returns wallet and earnings balances.

**POST**/billing/v1/account-balance  
signature  
HMAC: MerchantID

| Field | Description |
| :---- | :---- |
| MerchantID | Your merchant identifier. |
| signature | HMAC-SHA256 of MerchantID. |

***cURL***  
{  
  "MerchantID": "kyanda",  
  "signature": "HMAC(MerchantID)"  
}  
{  
  "Account\_Bal": 399930,  
  "Earnings\_Bal": 1586.6  
}  
[***Node.js***](http://Node.js)  
const signature \= sign(merchantId, apiKey);  
{  
  "Account\_Bal": 399930,  
  "Earnings\_Bal": 1586.6  
}  
***Python***  
signature \= hmac.new(api\_key.encode(), merchant\_id.encode(), hashlib.sha256).hexdigest()  
{  
  "Account\_Bal": 399930,  
  "Earnings\_Bal": 1586.6  
}  
***PHP***  
$signature \= hash\_hmac("sha256", $merchantId, $apiKey);  
{  
  "Account\_Bal": 399930,  
  "Earnings\_Bal": 1586.6  
}  
***Java***  
String signature \= hmacSha256(merchantId, apiKey);  
{  
  "Account\_Bal": 399930,  
  "Earnings\_Bal": 1586.6  
}

### Transaction status

Look up a request by the reference we returned on create.

**POST**/billing/v1/transaction-check  
signature  
HMAC: MerchantID \+ transactionRef

| Field | Description |
| :---- | :---- |
| MerchantID | Your merchant identifier. |
| transactionRef | merchant\_reference or transactionId from the create response. |
| signature | HMAC of MerchantID then transactionRef. |

***cURL***  
{  
  "MerchantID": "kyanda",  
  "transactionRef": "kyanda-API1089772",  
  "signature": "HMAC(MerchantID \+ transactionRef)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign(merchantId \+ transactionRef, apiKey); 

***Python***  
signature \= hmac.new(api\_key.encode(), f"{merchant\_id}{transaction\_ref}".encode(), hashlib.sha256).hexdigest() 

***PHP***  
$signature \= hash\_hmac("sha256", $merchantId . $transactionRef, $apiKey); 

***Java***  
String signature \= hmacSha256(merchantId \+ transactionRef, apiKey); 

### Telco prefix

Resolve a 3-digit prefix such as 722.

**POST**/billing/v1/prefix-check  
Signature  
HMAC: MerchantID only. prefix is not signed.

***cURL***  
{  
  "MerchantID": "kyanda",  
  "prefix": "722",  
  "signature": "HMAC(MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign(merchantId, apiKey); 

***Python***  
signature \= sign(merchant\_id) 

***PHP***  
$signature \= hash\_hmac("sha256", $merchantId, $apiKey); 

***Java***  
String signature \= hmacSha256(merchantId, apiKey); 

## Payments

Send to mobile wallets or banks. Collect with checkout (STK).

### Mobile wallet payout

MPESA, Airtel Money, or Equitel. Nested source and destination stay as shown.

**POST**/billing/v3/mobile-payout/create  
signature  
HMAC: amount \+ destinationPhone \+ initiatorName \+ initiatorCountry \+ channel \+ MerchantID  
Example: 15000715330000John DoeGermanyMPESAkyanda

| Field | Description |
| :---- | :---- |
| source.initiatorName | Full name, for example John Doe. |
| source.initiatorCountry | Country, for example Germany. |
| destination.destinationPhone | 10 digits starting with 07\. |
| destination.amount | Whole shillings. |
| destination.channel | MPESA, AIRTEL, or EQUITEL. |

***cURL***  
{  
  "MerchantID": "kyanda",  
  "source": { "initiatorName": "John Doe", "initiatorCountry": "Germany" },  
  "destination": { "destinationPhone": "0715330000", "amount": "1500", "channel": "MPESA" },  
  "signature": "HMAC(amount+destinationPhone+initiatorName+initiatorCountry+channel+MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const payload \= "1500" \+ "0715330000" \+ "John Doe" \+ "Germany" \+ "MPESA" \+ merchantId; 

***Python***  
payload \= "1500" \+ "0715330000" \+ "John Doe" \+ "Germany" \+ "MPESA" \+ merchant\_id 

***PHP***  
$payload \= "1500" . "0715330000" . "John Doe" . "Germany" . "MPESA" . $merchantId; 

***Java***  
String payload \= "1500" \+ "0715330000" \+ "John Doe" \+ "Germany" \+ "MPESA" \+ merchantId; 

### Bank payout

Use the Kyanda 3-digit bank code, not a CBK sort code. 101 is Absa.

**POST**/billing/v3/bank-payout/create  
signature  
HMAC: amount \+ accountNumber \+ phoneNumber \+ bankCode \+ initiatorName \+ initiatorCountry \+ MerchantID

***cURL***  
{  
  "MerchantID": "kyanda",  
  "source": { "initiatorName": "John Doe", "initiatorCountry": "Germany" },  
  "destination": {  
    "name": "Harry Kessy",  
    "accountNumber": "2042581154",  
    "phoneNumber": "0715330000",  
    "amount": "1500",  
    "bankCode": "101"  
  },  
  "signature": "HMAC(amount+accountNumber+phoneNumber+bankCode+initiatorName+initiatorCountry+MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const payload \= "1500" \+ "2042581154" \+ "0715330000" \+ "101" \+ "John Doe" \+ "Germany" \+ merchantId; 

***Python***  
payload \= "1500" \+ "2042581154" \+ "0715330000" \+ "101" \+ "John Doe" \+ "Germany" \+ merchant\_id 

***PHP***  
$payload \= "1500" . "2042581154" . "0715330000" . "101" . "John Doe" . "Germany" . $merchantId; 

***Java***  
String payload \= "1500" \+ "2042581154" \+ "0715330000" \+ "101" \+ "John Doe" \+ "Germany" \+ merchantId; 

| Bank | Code | Bank | Code |
| :---- | :---- | :---- | :---- |
| Absa Bank | 101 | Co-operative Bank | 102 |
| Equity Bank (K) | 103 | Family Bank | 104 |
| KCB Bank Kenya | 105 | Standard Chartered (K) | 106 |
| ABC Bank | 107 | I\&M Bank (K) | 108 |
| HF Group | 109 | Ecobank (K) | 110 |
| Habib Bank A.G. Zurich | 111 | NCBA Bank (K) | 112 |
| Stanbic Bank | 113 | Sidian Bank | 114 |
| Rafiki Microfinance Bank | 115 | Spire Bank | 116 |
| First Community Bank | 117 | Access Bank (K) | 118 |
| Diamond Trust Bank (K) | 119 | DIB Kenya Bank | 120 |
| Development Bank | 121 | Citibank N.A. | 122 |
| Bank of Baroda (K) | 123 | Bank of Africa (K) | 124 |
| Faulu Micro-Finance Bank | 125 | Credit Bank | 126 |
| Choice Microfinance Bank | 127 | Consolidated Bank | 128 |
| Caritas Microfinance Bank | 129 | Kenya Women Microfinance Bank | 130 |
| Mayfair Bank | 131 | Kingdom Bank | 132 |
| National Bank of Kenya | 133 | Middle East Bank (K) | 134 |
| Paramount Universal Bank | 135 | Prime Bank | 136 |
| Postbank | 137 | SBM Bank (K) | 138 |
| Victoria Commercial Bank | 139 | UBA Kenya Bank | 140 |
| Salaam Microfinance Bank | 141 | M Oriental Bank (K) | 142 |
| Gulf African Bank | 143 | Guaranty Trust Bank (K) | 144 |
| Guardian Bank | 145 | Bank of India (K) | 146 |

### Mobile checkout

Prompt the customer. They approve on the handset. You get the IPN when it lands.

**POST**/billing/v1/checkout/create  
Signature  
HMAC: amount \+ phoneNumber \+ channel \+ MerchantID  
Example: 15000715330000MPESAkyanda

| Field | Description |
| :---- | :---- |
| phoneNumber | 10 digits starting with 07\. |
| amount | Whole shillings to collect. |
| channel | MPESA, AIRTEL, or EQUITEL. |
| metadata | Optional object echoed on the IPN. |

***cURL***  
{  
  "MerchantID": "kyanda",  
  "phoneNumber": "0715330000",  
  "amount": "1500",  
  "channel": "MPESA",  
  "metadata": { "orderId": "SO-1001" },  
  "signature": "HMAC(amount+phoneNumber+channel+MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign("1500" \+ "0715330000" \+ "MPESA" \+ merchantId, apiKey); 

***Python***  
signature \= sign("1500" \+ "0715330000" \+ "MPESA" \+ merchant\_id) 

***PHP***  
$signature \= hash\_hmac("sha256", "1500"."0715330000"."MPESA".$merchantId, $apiKey); 

***Java***  
String signature \= hmacSha256("1500" \+ "0715330000" \+ "MPESA" \+ merchantId, apiKey); 

## Airtime

### Pinless airtime

Networks: SAFARICOM, AIRTEL, TELKOM, EQUITEL, FAIBA. Data bundles use FAIBA\_B on the same path.

**POST**/billing/v1/airtime/create  
Signature  
HMAC: amount \+ phone \+ telco \+ initiatorPhone \+ MerchantID  
Example: 1000715330000SAFARICOM0715330000kyanda  
Do not put productCode in the HMAC.

| Field | Description |
| :---- | :---- |
| phone | Recipient, 10 digits starting with 07\. |
| amount | Whole shillings. Greater than 2, less than 7000\. |
| telco | SAFARICOM, AIRTEL, TELKOM, EQUITEL, FAIBA, or FAIBA\_B. |
| initiatorPhone | Initiator number for records. |
| productCode | Required only for FAIBA\_B. Not signed. |

***cURL***  
{  
  "MerchantID": "kyanda",  
  "phone": "0715330000",  
  "amount": "100",  
  "telco": "SAFARICOM",  
  "initiatorPhone": "0715330000",  
  "signature": "HMAC(amount+phone+telco+initiatorPhone+MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign("100" \+ "0715330000" \+ "SAFARICOM" \+ "0715330000" \+ merchantId, apiKey); 

***Python***  
payload \= "100" \+ "0715330000" \+ "SAFARICOM" \+ "0715330000" \+ merchant\_id 

***PHP***  
$payload \= "100" . "0715330000" . "SAFARICOM" . "0715330000" . $merchantId; 

***Java***  
String payload \= "100" \+ "0715330000" \+ "SAFARICOM" \+ "0715330000" \+ merchantId; 

### Data Bundles

Same airtime endpoint. Set telco to FAIBA\_B and send a catalog productCode. Amount must match the table. API only.

**POST**/billing/v1/airtime/create  
Signature  
HMAC stays amount \+ phone \+ telco \+ initiatorPhone \+ MerchantID with telco FAIBA\_B. Example: 5000715330000FAIBA\_B0715330000kyanda. productCode is in the body only.

***cURL***  
{  
  "MerchantID": "kyanda",  
  "phone": "0715330000",  
  "amount": "500",  
  "telco": "FAIBA\_B",  
  "initiatorPhone": "0715330000",  
  "productCode": "Monthly\_15GB",  
  "signature": "HMAC(5000715330000FAIBA\_B0715330000kyanda)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign("500" \+ "0715330000" \+ "FAIBA\_B" \+ "0715330000" \+ merchantId, apiKey); 

***PHP***  
payload \= "500" \+ "0715330000" \+ "FAIBA\_B" \+ "0715330000" \+ merchant\_id 

***Python***  
$payload \= "500" . "0715330000" . "FAIBA\_B" . "0715330000" . $merchantId; 

***Java***  
String payload \= "500" \+ "0715330000" \+ "FAIBA\_B" \+ "0715330000" \+ merchantId; 

Send productCode exactly as listed. Auto-renew codes are optional at the same price.

| Bundle | Validity | KES | productCode | Auto-renew |
| :---- | :---- | :---- | :---- | :---- |
| Daily 500MB | 1 day | 20 | DAILY\_500MB | DAILY\_AUTO\_500MB |
| Fisi 3 hour | 3 hours | 50 | fisihour3 | — |
| Daily 1.5GB | 1 day | 50 | Daily\_1.5GB | — |
| Gumzo Weekly 50 | 7 days | 75 | Gumzo\_Weekly\_50 | — |
| Fisi 5 hour | 5 hours | 80 | fisihour5 | — |
| 3GB 3 day | 3 days | 100 | 3GB3DAY | — |
| Fisi 6 hour | 6 hours | 120 | fisihour6 | — |
| Weekly 10GB | 7 days | 300 | WEEKLY\_DATA\_10GB | WEEKLY\_DATA\_AUTO\_10GB |
| Gumzo Monthly 250 | 30 days | 300 | Gumzo\_Monthly\_250 | — |
| Monthly 15GB | 30 days | 500 | Monthly\_15GB | Monthly\_15GB\_Auto |
| Gumzo Monthly 500 | 30 days | 500 | Gumzo\_Monthly\_500 | — |
| All in One 5 | 30 days | 500 | All\_inOne\_5 | — |
| Monthly 40GB | 30 days | 1000 | MONTHLY\_DATA\_40GB | MONTHLY\_DATA\_AUTO\_40GB |
| All in One 10 | 30 days | 1000 | All\_inOne\_10 | — |
| Monthly 120GB | 30 days | 2000 | Monthly\_120GB | Monthly\_120GB\_Auto |
| All in One 20 | 30 days | 2000 | All\_inOne\_20 | — |
| Family Basic Plus 150 mins | 30 days | 2000 | Family\_Basic\_Plus\_150Mins | — |
| Family Plus Plus 300 mins | 30 days | 3500 | Family\_Plus\_Plus\_300Mins | — |
| Family Max Plus 600 mins | 30 days | 6000 | Family\_Max\_Plus\_600Mins | — |

## Callbacks

When a request finishes, we POST JSON to your HTTPS URL. Register it in the portal or here. After the first API registration, further changes go through support.

**POST**/billing/v1/callback-url/create  
Signature  
HMAC: MerchantID only. callbackURL is not signed.

***cURL***  
{  
  "MerchantID": "kyanda",  
  "callbackURL": "https://website.com/callback",  
  "signature": "HMAC(MerchantID)"  
} 

[***Node.js***](http://Node.js)  
const signature \= sign(merchantId, apiKey); 

***Python***  
signature \= sign(merchant\_id) 

***PHP***  
$signature \= hash\_hmac("sha256", $merchantId, $apiKey); 

***Java***  
String signature \= hmacSha256(merchantId, apiKey); 

Reply to every IPN with HTTP 200 and:

{  
  "status": "success"  
}

## Errors

Failures return status, status\_code, and transactiontxt.

| Code | Meaning |
| :---- | :---- |
| 0000 | Processed successfully. |
| 1100 | Accepted, still processing. |
| 1101 | Invalid Merchant ID. |
| 1102 | Authentication failed. |
| 1103 | Forbidden. |
| 1106 | Service unavailable. |
| 1109 | Blank required field. |
| 1201 | Invalid bank code. |
| 3101 | Invalid telco prefix (3 digits). |
| 4000 | Insufficient funds. |
| 8002 / 9001 | Invalid phone format. |
| 8003 | Invalid telco. |
| 8004 / 9003 | Invalid amount format. |
| 8005 / 9004 | Amount limit exceeded. |
| 8006 / 9005 | Duplicate transmission. |
| 9002 | Invalid channel, or data-bundle productCode / amount mismatch. |

Kyanda API · [Merchant portal](https://business.kyanda.app/login) 