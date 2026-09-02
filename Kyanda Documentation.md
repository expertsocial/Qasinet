# OVERVIEW

# Last updated: 20-01-2023

Kyanda API merchant service is engineered to create simple APIs that perform multiple complex functions. From a single payment APIs that make payments to mobile wallets, banks and cards to single Utility Vending that allows Bill Payments across multiple Telco’s and multiple digital service providers.

####  Note

Sandbox Endpoint **http://sandbox.kyanda.io:3030**

### API ACCOUNT

Building great products. We abstract all the complexity and present easy-to-integrate APIs for you.

### AUTHENTICATION AND AUTHORIZATION

##### Standard Request Headers

The standard request headers needed when authenticating with the API across all requests are:

| FIELD | DESCRIPTION |
| ----- | ----- |
| Content-Type | The content type of the payload: *application/json* |
| apiKey | This Key is generated upon registration. |

# API ACCOUNT

##### i. Check Account Balance

This Request fetches the Available Account Balances in the Payment and Billing platform.

##### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

##### Body Parameters:

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields with the following order: *MerchantID*  The resulting string is then signed with the Key Provided upon registration. |

    
    Example Request:

    POST http://sandbox.kyanda.io:3030/billing/v1/account-balance HTTP/1.1  
    Host: {GatewayBaseURL}  
    apiKey: {api-key}  
    Content-Type: application/json  
      {  
      "MerchantID":"kyanda",  
      "signature":"b916c162f49856f2bc897c43bcf62d48705bbe3f3397c075403f9f"  
      }  
	  
    Sample Response:  
    
          {  
          "Account\_Bal" :399930,  
          "Earnings\_Bal" :1586.6  
	   
          }  
	 

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

##### ii. Check Transaction Status.

This is a quick way to check whether the status of the Pending transaction.

##### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

##### Body Parameters:

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | The content type of the payload: *application/json* |
| transactionRef | This is the Merchant reference returned after a request has been posted on the payment and Billing platform. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields with the following order: *MerchantID+ transactionRef*  The resulting string is then signed with the Key Provided upon registration. |

    
    Example Request:  
	  
    POST http://sandbox.kyanda.io:3030/billing/v1/transaction-check HTTP/1.1  
    Host: {GatewayBaseURL}  
    apiKey: {api-key}  
    Content-Type: application/json  
    {  
   "MerchantID":"kyanda",  
   "transactionRef":"kyanda-API1089772",  
   "signature":"51d8864a2890e73e3254ddd84968d17583f7a1a0efb66ec8fe3138a893b0e253"  
    }  
	  
    Sample Response:  
    
      {  
     "status":"200",   
     "details" : {  
       "Amount": "50",  
       "Phone": "0747779233",  
       "Posted\_Time": "05-11-2021 9:19 am",  
       "Status": "Success",  
       "Telco": "jtl",  
       "timestamp": 16207153974638

     }

   }

---

##### iii. Telco Check.

This is a quick way to check the Telco.

##### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

##### Body Parameters:

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant doing Telco Check |
| Prefix | This is the Merchant reference returned after a request has been posted. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. |

    
    Example:  
	  
    "MerchantID": "",  
    "prefix": "722",  
    "signature": "" //sign only the merchant ID, similar to check balance API

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

# PAYMENT API

Payment Collection, Bank & Mobile Wallet Payout.

##### A. MOBILE WALLET PAYOUT API

This API allows you to send payments from your Payment Wallet to mobile subscribers with the following Mobile Wallet Channels available in Kenya.

1. MPESA  
2. AIRTEL MONEY  
3. EQUITEL

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | The content type of the payload: *application/json* |
| initiatorName | The First and Last Name of the Initiator in one string. ie. *John Doe* |
| initiatorCountry | The country the initiator is currently based in. ie. *Germany* |
| destinationPhone | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| channel | The channel the payment will be made from. It can either be the following: *MPESA, AIRTEL, EQUITEL* |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+phone+InitiatorName+InitiatorCountry+channel+MerchantID* Example Concatenated String:*15000715330000John DoeGermanyMPESAkyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *9447d0ea436cdddd756132c46136a1ecf6d511263669014c212b9db6f57d79b6* |

		  
   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v3/mobile-payout/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
      {  
      "MerchantID":"kyanda",  
      "source":  
      {  
	  
       "initiatorName":"John Doe",  
       "initiatorCountry": "Germany"  
   },

   "destination":  
     {  
         "destinationPhone":"0715330000",  
         "amount": "1500",  
         "channel":"MPESA"  
     },

         "signature":"9447d0ea436cdddd75614c212b9db6f57d79b6" 

   }

   Sample Response

     {  
          "status": "Pending",   
          "status\_code": "200",   
          "merchant\_reference": "KYAAPI677833",   
          "transactiontxt": "Request accepted for processing\!"   
   }

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL with the format below.**

   Example Success IPN/Callback

    {  
		  
       "category": "MobilePayout",  
       "source": "0715330000",  
       "destination": "0715330000",  
       "MerchantID": "kyanda",  
       "details":{  
		"biller\_Receipt": "WSA2639191930300",  
		"Telco Reference": "RA1388393",  
		"CustomerName": ""  
		 },  
     
	"requestMetadata": {},  
	"status": "Success",  
	"status\_code": "0000",  
	"message": "Your request has been processed successfully.",  
	"transactionDate": "23-09-2023 11.20am",  
	"transactionRef": "KYA1234219488",  
	"Amount": "100"  
    }

    
	  
	

##### B. BANK PAYOUT API

This API allows transfer of funds from your Payment wallet to Bank accounts within Kenya.

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| initiatorName | The First and Last Name of the Initiator in one string. ie *John Doe* |
| initiatorCountry | The country the initiator is currently based in. ie. *Germany* |
| name | The First and Last Name of the associated with the Bank Account in one string. eg *Harry Kessy* |
| accountNumber | Bank Account Number. eg *2042581154* |
| phoneNumber | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| bankCode | 3-Digit code for the Bank, well listed in the Bank Codes Section below. eg *101* |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+accountNumber+phoneNumber+bankCode+InitiatorName+InitiatorCountry+MerchantID* Example Concatenated String:*150020425811540715330000101John DoeGermanykyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *9447d0ea436cdddd756132c46136a1ecf6d511263669014c212b9db6f57d79b6* |

Bank Codes

| Bank Name | Kyanda Code |
| ----- | ----- |
| Absa Bank | 101 |
| Co-operative Bank | 102 |
| Equity Bank(K) | 103 |
| Family Bank | 104 |
| KCB Bank Kenya (K) | 105 |
| Standard Chartered Bank (K) | 106 |
| ABC Bank | 107 |
| I & M Bank (K) | 108 |
| HF Group | 109 |
| Ecobank (K) | 110 |
| Habib Bank A.G. Zurich | 111 |
| NCBA Bank(K) | 112 |
| Stanbic Bank | 113 |
| Sidian Bank | 114 |
| Rafiki Microfinance Bank | 115 |
| Spire Bank | 116 |
| First Community Bank | 117 |
| Access Bank (K) | 118 |
| Diamond Trust Bank (K) | 119 |
| DIB Kenya Bank | 120 |
| Development Bank | 121 |
| Citibank N.A. | 122 |
| Bank of Baroda (K) | 123 |
| Bank of Africa (K) | 124 |
| Faulu Micro-Finance Bank | 125 |
| Credit Bank | 126 |
| Choice Microfinance Bank | 127 |
| Consolidated Bank | 128 |
| Caritas Microfinance Bank | 129 |
| Kenya Women Microfinance Bank | 130 |
| Mayfair Bank | 131 |
| Kingdom Bank | 132 |
| National Bank of Kenya | 133 |
| Middle East Bank (K) | 134 |
| Paramount Universal Bank | 135 |
| Prime Bank | 136 |
| Postbank | 137 |
| SBM Bank (K) | 138 |
| Victoria Commercial bank | 139 |
| UBA Kenya Bank | 140 |
| Salaam Microfinance Bank | 141 |
| M Oriental Bank (K) | 142 |
| Gulf African Bank | 143 |
| Guaranty Trust Bank (K) | 144 |
| Guardian Bank | 145 |
| Bank of India(K) | 146 |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v3/bank-payout/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
   {  
   "MerchantID":"kyanda",

   "source":  
    {  
	  
      "initiatorName":"John Doe",  
      "initiatorCountry": "Germany"  
   	  
   },

   "destination":  
    {  
      "name":"Harry Kessy",  
      "accountNumber":"2042581154",  
      "phoneNumber":"0715330000",  
      "amount": "1500",  
      "bankCode":"101"  
   },

      "signature":"d1c574dfa94e43f77f6d0c18d48c809466a8fde21fa6886ba2480d4952871d8f" 

   }

   Sample Response

     {  
      "status": "Pending",   
      "status\_code": "200",   
      "merchant\_reference": "KYAAPI677833",   
      "transactiontxt": "Request accepted for processing\!" 

   }

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**

##### C. PAYMENT COLLECTION API

###### i. Mobile Checkout

Mobile checkout API allows you to initiate a Consumer to Business transaction on a Mobile subscriber’s device. Once initiated, the Subscriber will only need to authorize the payment.

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| phoneNumber | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| channel | The channel the payment will be made from. It can either be the following: *MPESA, AIRTEL, EQUITEL* |
| metadata | A map of any metadata you would like us to associate with the request. You can use this field to pass Account details, Payment reasons, or any other details that will assist to process the payment. \-It will be included in the Instant Payment Notification once the subscriber completes the mobile checkout request. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+phoneNumber+channel+MerchantID* Example Concatenated String:*15000715330000MPESAkyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *9447d0ea436cdddd756132c46136a1ecf6d511263669014c212b9db6f57d79b6* |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v1/checkout/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
    {  
       "MerchantID":"kyanda",  
       "phoneNumber":"0715330000",  
       "amount": "1500",  
       "channel": "MPESA",  
       "metadata":{  
       "abc":"balloon",  
    },  
     
       "signature":"092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428"  
    }

   Sample Response

   {  
        "status": "Pending",  
        "status\_code": "200",  
        "merchant\_reference": "KYAAPI677833",  
        "transactiontxt": "Request accepted for processing\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL with the below format.**

   Example Success IPN/Callback

    {  
		  
       "category": "MpesaPayment",  
       "source": "0715330000",  
       "Phone": "0715330000",  
       "MerchantID": "kyanda",  
       "details":{  
		"one": "Biller Receipt No: RA124646488" ,  
		"two": "Kyanda Reference: KYA193838833S"  
		},  
    
	"Status": "Success",  
	"status\_code": "0000",  
	"message": "Your request has been processed successfully.",  
	"Posted\_Time": "23-09-2023 11.20am",  
	"transactionRef": "KYA193838833S",  
	"Amount": "100"  
    }

    
	  
	

##### D. UPI

This endpoint facilitates seamless money transfers between Saccos, banks, and fintech platforms, enabling secure and efficient transactions among various financial entities

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| sender\_party | (Sender Account Number) \- The account number of the sender. |
| recipient\_party | (Recipient Account Number) \- The account number of the recipient. |
| sender\_channel | (Sender Account Code) \- The code associated with the sender's account. |
| recipient\_channel | (Recipient Account Code) \- The code associated with the recipient's account. |
| sender\_curr | The currency of the sender's account. |
| recipient\_curr | The currency of the recipient's account. |
| amount | The amount to be transferred. |
| description | A brief description of the transaction. |

		  
   Example Request:

   POST http://sandbox.kyanda.io:3030/v1/transaction/transact-link  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
   {  
    "data":{  
      "sender\_party": "\*\*\*\*\*0001",  
      "recipient\_party": "\*\*\*\*\*0002",:  
	  "sender\_channel": "112",  
       "recipient\_channel": "103",  
	   "sender\_curr": "KSH",  
       "recipient\_curr": "KSH",  
        
        "amount": "10",  
        
        "description": "Test"  
      

       

   }  
}

   Sample Response

     {  
          "statuscode": 200,   
          "ref": "KUPI638346AB84",   
          "status": "Transfer of Ksh.1 from \*\*\*\*\*0001 to \*\*\*\*\*0002 is being processed. Kindly await confirmation message."   
   }

Account Codes

| Prefix | Example |
| ----- | ----- |
| Bank | 101 |
| Fintech | 201 |
| Sacco | 301 |

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL with the format below.**

##### E. B2B

###### i. Create B2B Transaction

This endpoint allows you to create a business-to-business (B2B) transaction for billing purposes.

###### Request Headers

apiKey: Your API Key

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| channel | The channel through which the transaction is being processed. |
| resultUrl | The URL to which the transaction result will be sent asynchronously. |
| destination | The details of the destination account for the transaction. |
| shortCode | The destination shortcode. |
| identifier | The destination account number. |
| amount | The amount of the transaction. |
| remarks | Any remarks or notes for the transaction. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *MerchantID \+ channel \+ shortCode \+ identifier \+ amount* Sample Signature generated from the above Concatenated String: *9447d0ea436cdddd756132c46136a1ecf6d511263669014c212b9db6f57d79b6* |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v3/b2b/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
    {  
       "MerchantID":"kyanda",  
       "channel":"BusinessPayBill",  
       "resultUrl": "",  
       "destination":{  
       "shortCode":"4004004",  
       "identifier":"0753338080",  
       "amount":"5",  
       "remarks":"Testing",  
    },  
     
       "signature":"092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428"  
    }

   Sample Response

   {  
        "status": "Success",  
        "status\_code": "1100",  
        "merchant\_reference": "KYAAPI677833",  
        "transactiontxt": "Request accepted for processing\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL with the below format.**

# UTILITY API

Vend Utility services through your Platform.

##### A. AIRTIME API

This API allows the disbursement of Pinless Airtime from your Payment Wallet to Mobile subscribers with the following networks.

1. SAFARICOM  
2. AIRTEL  
3. TELKOM  
4. EQUITEL  
5. FAIBA  
6. FAIBA BUNDLES

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| phone | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| productCode | The package selected for FAIBA BUNDLES.Refer Faiba bundle packages [below](https://docs.kyanda.co.ke/#faibapac). ie *DAILY\_DATA\_225MB* |
| telco | The channel the payment will be made from. It can either be the following: *SAFARICOM, AIRTEL, EQUITEL, TELKOM, FAIBA, FAIBA\_B* |
| initiatorPhone | This is the initiator’s Phone number attached along the transaction for record purposes. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+phone+telco+initiatorPhone+MerchantID* Example Concatenated String:*15000715330000SAFARICOM0715330000kyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428* |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v1/airtime/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
     {  
       "MerchantID":"kyanda",  
       "phone":"0715330000",  
       "amount": "1500",  
       "telco": "SAFARICOM",  
       "initiatorPhone": "0715330000",  
       "signature":"092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428"  
   }

   Sample Response

   {  
       "status": "Success",  
       "status\_code": "0000",  
       "merchant\_reference": "KYAAPI677833",  
       "transactiontxt": "Your request has been posted successfully\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**

| Bundle | Validity | price | Product Code | Autorenewal codes |
| ----- | ----- | ----- | ----- | ----- |
| 100MB | 1 day | 10.00 | DAILY\_DATA\_100MB | DAILY\_DATA\_AUTO\_100MB |
| 225MB | 1 day | 20.00 | DAILY\_DATA\_225MB | DAILY\_DATA\_AUTO\_225MB |
| 1GB | 1 day | 50.00 | DailyData1GB | N/A |
| 2.5GB | 3 day | 100.00 | 3\_DAYS\_DATA\_2.5GB | N/A |
| 8GB | 7 day | 300.00 | WeeklyData8GB | N/A |
| 15GB | 10 days | 500.00 | 10\_DAY\_DATA\_15GB | N/A |
| 30GB | 30 days | 1,000.00 | MONTHLY\_DATA\_30GB | MONTHLY\_DATA\_AUTO\_30GB |
| 65GB | 30 days | 2,000.00 | MONTHLY\_DATA\_65GB | MONTHLY\_DATA\_AUTO\_65GB |
| 100GB | 60 days | 3,000.00 | 60\_DAY\_DATA\_100GB | 60\_DAY\_DATA\_AUTO\_100GB |
| 140GB | 60 days | 4,000.00 | 60\_DAY\_DATA\_140GB | 60\_DAY\_DATA\_AUTO\_140GB |
| 225GB | 90 days | 6,000.00 | 90\_DAY\_DATA\_225GB | 90\_DAY\_DATA\_AUTO\_225GB |

| Plan | Minutes | SMS | Data (GB) | Validity | Price | Product Code |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Chui | 300 | 100 | 5 | 30 days | 500.00 | CHUI\_DATA\_5GB |
| Kifaru | 500 | 100 | 7 | 30 days | 700.00 | KIFARU\_DATA\_7GB |
| Ndovu | 700 | 100 | 10 | 30 days | 1,000.00 | NDOVU\_DATA\_10GB |
| Simba | 1,500 | 100 | 20 | 30 days | 2,000.00 | SIMBA\_DATA\_20GB |

##### B. PAY BILL API

This API allows supports the following Service Providers:

1. Kenya Power (Both Prepaid and Postpaid)  
2. Tv Subscriptions (DSTV, GOTV, ZUKU, STARTIMES)  
3. Water Service.

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| account | Account Number. Eg *0123456789* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| telco | The destination telco. The channels codes are attached below. |
| initiatorPhone | This is the initiator’s Phone number attached along the transaction for record purposes. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+account+telco+initiatorPhone+MerchantID* Example Concatenated String:*1500012345678DSTV0715330000kyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428* |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v1/bill/create HTTP/1.1  
   Host: {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
    {  
        "MerchantID":"kyanda",  
        "phone":"0715330000",  
        "amount": "1500",  
        "telco": "DSTV",  
        "initiatorPhone": "0715330000",  
        "signature":"092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428"  
   }

   Sample Response

   {  
        "status": "Success",  
        "status\_code": "0000",  
        "transactionId": "KYAAPI677833",  
        "transactiontxt": "Your request has been posted successfully\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**

#### DESTINATION CHANNEL CODES

| TELCO | CHANNEL CODE |
| ----- | ----- |
| Tv Subscription | GOTV | DSTV | ZUKU | STARTIMES |
| Water Service | NAIROBI\_WTR |

##### C. VOUCHER/PIN AIRTIME API

This API allows the disbursement of Pin/voucher Airtime from your Payment Wallet to Mobile subscribers with the following networks.

1. SAFARICOM  
2. AIRTEL  
3. TELKOM

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| phone | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| amount | Amount that the recipient is expected to receive. ie *1500* |
| telco | The destination telco. It can either be the following:*SAFARICOM, AIRTEL, TELKOM* |
| initiatorPhone | This is the initiator’s Phone number attached along the transaction for record purposes. |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *amount+phone+telco+initiatorPhone+MerchantID* Example Concatenated String:*15000715330000SAFARICOM0715330000kyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428* |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v1/pin-airtime/create HTTP/1.1  
   Host: : {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
    {  
      "MerchantID":"kyanda",  
      "phone":"0715330000",  
      "amount": "1500",  
      "telco": "SAFARICOM",  
      "initiatorPhone": "0715330000",  
      "signature":"092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428"  
   }

   Sample Response Success

   {  
      "status": "Success",  
       "status\_code": "0000",  
       "transactionId": "KYAAPI677833",  
       "transactiontxt": "Your request has been posted successfully\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**

#### SMS

This API enables you to send Bulk SMS messages, OTPs, and SMS services from your platform to mobile subscribers. It supports the following features:

* Bulk SMS delivery to multiple recipients  
* One-Time Password (OTP) generation and delivery  
* Customizable SMS services

Integrate this API to seamlessly incorporate SMS functionalities into your application or service.

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

###### Body Parameters

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | This identifies the Merchant making use of the Payment and Billing platform. |
| phone | Phone Number of the Recipient beginning with 07\. Must be 10 Digits. Eg *0715330000* |
| otp | Auto-generated 4-digit code. Eg *4343* |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields. In this case, use the following order: *phone+otp+MerchantID* Example Concatenated String:*07153300001556kyanda*The resulting string is then signed with the Security Key provided/generated upon registration. Sample Signature generated from the above Concatenated String: *092f758dec7149cc4c4cd09e2122d10016d0e2f8e2aed5d0b8a0615982ed1428* |

# USSD

##### i. Handling a session

Handling a ussd session made to your Kyanda service code is as easy as implementing a script on your web server that handles

A few things to note about USSD:

* This USSD system operates on a session-based model. Each request we send will include a session ID, which will persist until the session is finished.  
* It's important to inform the Mobile Service Provider about the session's status.If the session is ongoing, please initiate your response with "CON." On the other hand, if this is the final response for the session, start your response with "END."  
* If our script returns an HTTP error response (status code 40X) or an improperly formatted response that doesn't start with "CON" or "END," we will gracefully terminate the USSD session.  
* To ensure smooth access to your USSD services, avoid using special characters in your USSD menu, as telecom companies may have difficulty rendering such content, potentially causing disruptions.

##### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

##### Body Parameters:

| FIELD | DESCRIPTION |
| ----- | ----- |
| sessionId | A unique value generated when the session starts and sent every time a mobile subscriber response has been received. |
| phoneNumber | A unique value generated when the session starts and sent every time a mobile subscriber response has been received. |
| networkCode | The telco of the phoneNumber interacting with your ussd application. |
| serviceCode | This is the USSD code assigned to your application |
| text | This shows the user input. It is an empty string in the first notification of a session. After that, it concatenates all the user input within the session with a \* until the session ends. |

						  
   Example Callback URL Response:

    
	{  
	  "sessionId":"8003850",  
	  "serviceCode":"\*860\*30\#",  
	  "phoneNumber": "0715330000",  
	  "text": "\*30\*30\*1",  
	}

   Handling Session

   "if (text \== '')"  
   {  
	//this is the first request  
	//Note for the first request the text string will always be blank.  
	//Note how we start the response with CON  
	  "response \= \`CON What would you like to check  
	    1\. My account  
	    2\. My phone number";  
	    
   }  "if (text \== '\*30\*30\*1')"{  
	// Business logic for first level response  
  	  "response \= \`CON Choose account information you want to view  
	   1\. Account number";

   } "if (text \== '\*30\*30\*2')"{  
	// Business logic for first level response  
    // This is a terminal request. Note how we start the response with END  
	 "response \= \`END Your phone number is ${phoneNumber}";

   } "if (text \== '\*30\*30\*2')"{  
	// This is a second level response where the user selected 1 in the first instance  
	"const accountNumber \= 'Kya234242'";  
	// This is a terminal request. Note how we start the response with END  
	" response" \= "END Your account number is ${accountNumber}";

   }  
   // Echo the response back to the API  
    " res.set('Content-Type: text/plain')";  
    " res.send(response)";

						

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**

# INSTANT PAYMENT NOTIFICATION

A notification is information sent to your application whenever we need to let you know that something/change has occurred. For instance, when a payment has been initiated, the request is pending. Once the payment is fully executed, we immediately send you the details of the transaction as POST variables to the callback URL you set on your Application for a given product.

The Callback URL can be registered in two ways:

1. Through API settings on the Kyanda Merchant Dashboard.  
2. Through the API endpoint.

####  Note

Once the endpoint is registered, no further changes can be made using this endpoint. In case one needs the callback changed, engage our Support team for assistance.

###### Callback URL Registration.

This request enables the registration of the Callback URL

###### Request Parameters

In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields:

#### DESTINATION CHANNEL CODES

| FIELD | DESCRIPTION |
| ----- | ----- |
| MerchantID | In addition to the [Standard request headers](https://docs.kyanda.co.ke/#auth), the body of the request should contain the following fields: |
| callbackURL | HTTPS callback URL |
| signature | A HMAC SHA-256 signature to proof that the request is coming from the Merchant. Build a string of concatenated values of the request fields with the following order: MerchantID The resulting string is then signed with the Key Provided upon registration. |

   Example Request:

   POST http://sandbox.kyanda.io:3030/billing/v1/callback-url/create HTTP/1.1  
   Host: : {GatewayBaseURL}  
   apiKey: {api-key}  
   Content-Type: application/json  
     {  
       "MerchantID":"kyanda",  
       “callbackURL”:”https://website.com/callback”,  
       "signature":"d1c574dfa94e43f77f6d0c18d48c809466a8fde21fa6886ba2480d4952871d8f"  
   }

   Sample Response

   {  
        "status": "Success",  
        "status\_code": "0000",  
        "transactionId": "KYAAPI677833",  
        "transactiontxt": "Callback Updated\!"  
   }  
	  
	

####  Note

For possible errors and solutions, refer to the [Error](https://docs.kyanda.co.ke/index.html#errors) section.

**Once the request has been posted, we shall send an IPN/Callback to the registered URL**  
Once you receive the IPN, you will be expected to send back a JSON response that confirms that you have received the IPN. Ensure to respond with status 200 and the below JSON body.

 {  
   “status”:success”							     
 }  
							  
							

# APPENDIX

Errors and Possible solutions

Standard Errors across the platform.

| CODE | DESCRIPTION |
| ----- | ----- |
| 0000 | Request processed sucessfully. |
| 1100 | Transaction created and pending processing. |
| 1101 | Invalid Merchant ID. |
| 1102 | Authentication failed. |
| 1103 | Forbidden access |
| 1104 | Signature Mismatch. |
| 1105 | Payment services unavailable. |
| 1106 | Airtime Service unavailable. |
| 1107 | Insufficient float balance. |
| 1108 | Missing parameter. |
| 1109 | Parameter validation error. |
| 1201 | Invalid Bank Code |
| 5000 | Unexpected error has occurred. |
| 6001 | Cannot register the URL |
| 6002 | Invalid URL format. |
| 7001 | Transaction not found. |
| 8001 | Invalid account number format. |
| 8002 | Invalid phone number format. |
| 8003 | Invalid Telco. |
| 8004 | Invalid amount format. |
| 8005 | Amount limit exceeded. |
| 8006 | Duplicate transmission. |
| 9001 | Invalid phone number format. |
| 9002 | Invalid transaction channel. |
| 9003 | Invalid amount format. |
| 9004 | Amount limit exceeded. |
| 9005 | Duplicate transmission |

