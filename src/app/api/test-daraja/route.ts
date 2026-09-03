import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    const passkey = process.env.MPESA_PASSKEY || '';
    const phone = '254722647928'; // Ensure this is the correct phone to test with

    const combinations = [
      { shortcode: '4184467', partyB: '4184501', type: 'CustomerBuyGoodsOnline', desc: 'Store as Shortcode, Till as PartyB (Buy Goods)' },
      { shortcode: '4184501', partyB: '4184501', type: 'CustomerBuyGoodsOnline', desc: 'Till as both (Buy Goods)' },
      { shortcode: '4184467', partyB: '4184467', type: 'CustomerPayBillOnline', desc: 'Store as Paybill' },
      { shortcode: '4184501', partyB: '4184501', type: 'CustomerPayBillOnline', desc: 'Till as Paybill' }
    ];

    // 1. Get Token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store'
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Failed to get token', details: await tokenRes.text() }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();
    const results = [];

    // 2. Test Combinations
    for (const combo of combinations) {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = Buffer.from(`${combo.shortcode}${passkey}${timestamp}`).toString('base64');
      
      const payload = {
        BusinessShortCode: combo.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: combo.type,
        Amount: 1,
        PartyA: phone,
        PartyB: combo.partyB,
        PhoneNumber: phone,
        CallBackURL: 'https://qasinet.vercel.app/api/webhooks/mpesa',
        AccountReference: 'Test',
        TransactionDesc: 'Test'
      };

      try {
        const res = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        results.push({
          combo: combo.desc,
          success: res.ok,
          response: data
        });
      } catch (err: any) {
        results.push({
          combo: combo.desc,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
