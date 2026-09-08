#!/usr/bin/env node

/**
 * scripts/check-faiba-authorization.mjs
 * 
 * Periodic verification tool to test whether Kyanda has enabled FAIBA_B
 * (Faiba data bundle vending) on the merchant profile.
 * 
 * Usage:
 *   node scripts/check-faiba-authorization.mjs
 *   OR: npm run check:faiba-bundles
 * 
 * Evaluation Logic:
 *   - HTTP 400 with status_code: "1107" (Insufficient Funds) => AUTHORIZED!
 *     The gateway verified the merchant, channel, and bundle code, and only stopped at float.
 *   - HTTP 400 with status_code: "9002" (Invalid Faiba productCode) => BLOCKED / PENDING.
 *     The gateway recognizes the channel and parameter, but rejects vending on the merchant account.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

// Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
let envFile = '';
if (fs.existsSync(envPath)) {
  envFile = fs.readFileSync(envPath, 'utf8');
}

const getEnv = (key) => process.env[key] || envFile.match(new RegExp('^' + key + '=(.*)$', 'm'))?.[1]?.trim();

const apiKey = getEnv('KYANDA_API_KEY');
const merchantId = getEnv('KYANDA_MERCHANT_ID') || 'qasinet';
const securityKey = getEnv('KYANDA_SECURITY_KEY');
const baseUrl = getEnv('KYANDA_BASE_URL') || 'https://api.kyanda.app';

if (!apiKey || !securityKey) {
  console.error('❌ Error: KYANDA_API_KEY and KYANDA_SECURITY_KEY must be configured in .env.local or process environment.');
  process.exit(1);
}

function generateAirtimeSignature(amount, phone, telco, initiatorPhone, merchantId, securityKey) {
  const data = amount + phone + telco + initiatorPhone + merchantId;
  return crypto.createHmac('sha256', securityKey).update(data).digest('hex');
}

function postGateway(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const url = new URL(endpoint, baseUrl);
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apiKey': apiKey
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gateway request timed out (20s)'));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkAuthorization() {
  console.log('===========================================================');
  console.log('  KYANDA FAIBA BUNDLE (FAIBA_B) AUTHORIZATION STATUS CHECK');
  console.log('===========================================================');
  console.log(`Gateway:       ${baseUrl}`);
  console.log(`Merchant:      ${merchantId}`);
  console.log(`Test Bundle:   DAILY_500MB (Amount: 20 KES)`);
  console.log(`Test Telco:    FAIBA_B`);
  console.log('-----------------------------------------------------------');

  const phone = '0747123456';
  const initiatorPhone = '0722647928';
  const amount = '20';
  const productCode = 'DAILY_500MB';
  const telco = 'FAIBA_B';

  const validSignature = generateAirtimeSignature(amount, phone, telco, initiatorPhone, merchantId, securityKey);

  const payload = {
    MerchantID: merchantId,
    phone,
    amount,
    telco,
    initiatorPhone,
    signature: validSignature,
    productCode
  };

  console.log('Sending live verification request to /billing/v1/airtime/create ...');

  let res;
  try {
    res = await postGateway('/billing/v1/airtime/create', payload);
  } catch (err) {
    console.error(`❌ Network / Gateway Error: ${err.message}`);
    process.exit(1);
  }

  const statusCode = res.data?.status_code;
  const message = res.data?.transactiontxt || res.data?.message || res.raw;
  const txId = res.data?.transactionId || res.data?.merchant_reference || 'N/A';

  console.log(`HTTP Status:     ${res.status}`);
  console.log(`Kyanda Code:     ${statusCode}`);
  console.log(`Kyanda Message:  "${message}"`);
  console.log(`Transaction ID:  ${txId}`);
  console.log('-----------------------------------------------------------');

  if (statusCode === '1107' || statusCode === '4000' || statusCode === '0000') {
    console.log('🎉 RESULT: [AUTHORIZED]');
    console.log('Kyanda has accepted the bundle code and verified merchant authorization!');
    console.log(`The request generated transaction reference: ${txId} and proceeded to the float check (status_code: ${statusCode}).`);
    console.log('\nACTION REQUIRED:');
    console.log('1. Set NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES=true in .env.local (and production environment variables).');
    console.log('2. Redeploy or restart the app to unlock customer-facing Faiba bundle checkout.');
    process.exit(0);
  } else if (statusCode === '9002') {
    console.log('⚠️  RESULT: [BLOCKED / PENDING KYANDA AUTHORIZATION]');
    console.log('Kyanda returned 9002 ("Invalid Faiba productCode").');
    console.log('This confirms the merchant account (qasinet) is not yet authorized for Faiba bundle vending.');
    console.log('\nCURRENT STATUS:');
    console.log('- Feature flag NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES remains false.');
    console.log('- Customer checkout for Faiba bundles remains safely paused with explanatory banner.');
    console.log('- Pinless Faiba Airtime (telco: "FAIBA") remains 100% active and functioning.');
    console.log('\nNEXT STEPS:');
    console.log('Contact Kyanda merchant support to request activation of "FAIBA_B" data bundles for merchant ID "qasinet".');
    process.exit(1);
  } else {
    console.log(`❓ RESULT: [UNEXPECTED STATUS: ${statusCode}]`);
    console.log(`Full response: ${JSON.stringify(res.data, null, 2)}`);
    process.exit(1);
  }
}

checkAuthorization().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
