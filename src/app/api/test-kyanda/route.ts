import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateHmac(data: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testPhone = searchParams.get('phone') || '0722647928';
    const testAmount = searchParams.get('amount') || '5';

    const baseUrl = process.env.KYANDA_BASE_URL || 'https://api.kyanda.app';
    const apiKey = process.env.KYANDA_API_KEY || '';
    const merchantId = process.env.KYANDA_MERCHANT_ID || '';
    const securityKey = process.env.KYANDA_SECURITY_KEY || '';
    const callbackURL = process.env.KYANDA_CALLBACK_URL || 'https://qasinet.vercel.app/api/webhooks/kyanda';

    const envInfo = {
      baseUrl,
      merchantId,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      hasSecurityKey: !!securityKey,
      securityKeyLength: securityKey.length,
      callbackURL
    };

    const results: any[] = [];

    // Helper to test Kyanda endpoint
    async function testEndpoint(name: string, endpoint: string, payload: any, customHeaders: Record<string, string> = {}) {
      const url = `${baseUrl}${endpoint}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apiKey': apiKey,
            ...customHeaders
          },
          body: JSON.stringify(payload)
        });

        let bodyText = await res.text();
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(bodyText);
        } catch (e) {
          // not JSON
        }

        results.push({
          test: name,
          endpoint,
          payload,
          status: res.status,
          statusText: res.statusText,
          success: res.ok,
          response: parsedJson || bodyText
        });
      } catch (err: any) {
        results.push({
          test: name,
          endpoint,
          payload,
          success: false,
          error: err.message
        });
      }
    }

    // Test 1: Account Balance check
    const balanceSignature = generateHmac(merchantId, securityKey);
    await testEndpoint('Account Balance Check', '/billing/v1/account-balance', {
      MerchantID: merchantId,
      signature: balanceSignature
    });

    // Test 2: Airtime with phone as 07... and string amount
    const phone07 = testPhone.startsWith('254') ? '0' + testPhone.slice(3) : testPhone;
    const phone254 = testPhone.startsWith('0') ? '254' + testPhone.slice(1) : testPhone;
    const initiator07 = '0722647928';

    // Variation A: phone 07xx, amount string, with callbackURL
    const sigA = generateHmac(`${testAmount}${phone07}SAFARICOM${initiator07}${merchantId}`, securityKey);
    await testEndpoint('Airtime: 07xx phone, SAFARICOM, with callbackURL', '/billing/v1/airtime/create', {
      MerchantID: merchantId,
      phone: phone07,
      amount: String(testAmount),
      telco: 'SAFARICOM',
      initiatorPhone: initiator07,
      signature: sigA,
      callbackURL: callbackURL
    });

    // Variation B: phone 07xx, amount string, WITHOUT callbackURL
    await testEndpoint('Airtime: 07xx phone, SAFARICOM, NO callbackURL', '/billing/v1/airtime/create', {
      MerchantID: merchantId,
      phone: phone07,
      amount: String(testAmount),
      telco: 'SAFARICOM',
      initiatorPhone: initiator07,
      signature: sigA
    });

    // Variation C: phone 254xx, amount string, with callbackURL
    const sigC = generateHmac(`${testAmount}${phone254}SAFARICOM${phone254}${merchantId}`, securityKey);
    await testEndpoint('Airtime: 254xx phone, SAFARICOM, with callbackURL', '/billing/v1/airtime/create', {
      MerchantID: merchantId,
      phone: phone254,
      amount: String(testAmount),
      telco: 'SAFARICOM',
      initiatorPhone: phone254,
      signature: sigC,
      callbackURL: callbackURL
    });

    // Variation D: Lowercase/Titlecase 'Safaricom'
    const sigD = generateHmac(`${testAmount}${phone07}Safaricom${initiator07}${merchantId}`, securityKey);
    await testEndpoint('Airtime: Safaricom (Titlecase), 07xx phone', '/billing/v1/airtime/create', {
      MerchantID: merchantId,
      phone: phone07,
      amount: String(testAmount),
      telco: 'Safaricom',
      initiatorPhone: initiator07,
      signature: sigD
    });

    return NextResponse.json({
      envInfo,
      results
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
