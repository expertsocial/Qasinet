const fetch = require('node-fetch'); // Requires node-fetch if Node < 18, but Node 18+ has native fetch.

async function testWebhook() {
  const payload = {
    Body: {
      stkCallback: {
        MerchantRequestID: "29115-34620561-1",
        CheckoutRequestID: "ws_CO_191220231530234567",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            {
              Name: "Amount",
              Value: 1.0
            },
            {
              Name: "MpesaReceiptNumber",
              Value: "NLJ7RT61SV"
            },
            {
              Name: "Balance"
            },
            {
              Name: "TransactionDate",
              Value: 20231219153033
            },
            {
              Name: "PhoneNumber",
              Value: 254708374149
            }
          ]
        }
      }
    }
  };

  const url = process.argv[2] || 'http://localhost:3000/api/webhooks/mpesa';
  
  console.log(`Sending dummy Daraja webhook to ${url}...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Failed to send webhook:", err);
  }
}

testWebhook();
