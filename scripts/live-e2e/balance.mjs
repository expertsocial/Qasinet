/**
 * scripts/live-e2e/balance.mjs
 * 
 * Standalone live Kyanda merchant float checker for the E2E verification harness.
 * Evaluates available float balance before real transactions are scheduled.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

/**
 * Loads .env.local variables if not already in process.env
 */
export function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

/**
 * Fetches the live merchant account balance from Kyanda
 */
export async function getLiveKyandaBalance(timeoutMs = 15000) {
  loadEnv();

  const apiKey = process.env.KYANDA_API_KEY;
  const merchantId = process.env.KYANDA_MERCHANT_ID || 'qasinet';
  const securityKey = process.env.KYANDA_SECURITY_KEY;
  const baseUrl = process.env.KYANDA_BASE_URL || 'https://api.kyanda.app';

  if (!apiKey || !securityKey) {
    return {
      success: false,
      error: 'Missing KYANDA_API_KEY or KYANDA_SECURITY_KEY in environment/.env.local',
      accountBal: 0,
      earningsBal: 0,
      raw: null,
    };
  }

  const signature = crypto.createHmac('sha256', securityKey).update(merchantId).digest('hex');
  const payload = JSON.stringify({
    MerchantID: merchantId,
    signature: signature,
  });

  const url = `${baseUrl.replace(/\/+$/, '')}/billing/v1/account-balance`;
  const retries = 2;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
          'User-Agent': 'QasiNet-LiveE2E/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const parsed = await res.json().catch(() => ({}));
      const accountBal = parseFloat(parsed.Account_Bal || '0');
      const earningsBal = parseFloat(parsed.Earnings_Bal || '0');
      const isSuccess = parsed.status_code === '0000' || parsed.status === 'success' || !isNaN(accountBal);

      return {
        success: isSuccess,
        accountBal: isNaN(accountBal) ? 0 : accountBal,
        earningsBal: isNaN(earningsBal) ? 0 : earningsBal,
        raw: parsed,
        httpStatus: res.status,
      };
    } catch (err) {
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      return {
        success: false,
        error: `Network error connecting to Kyanda gateway: ${err.message}`,
        accountBal: 0,
        earningsBal: 0,
        raw: null,
      };
    }
  }
}

// Allow running directly via CLI: node scripts/live-e2e/balance.mjs
if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) {
  console.log('Querying live Kyanda merchant float balance...');
  const res = await getLiveKyandaBalance();
  if (res.success) {
    console.log(`✅ Account_Bal:  KES ${res.accountBal.toLocaleString()}`);
    console.log(`   Earnings_Bal: KES ${res.earningsBal.toLocaleString()}`);
    console.log(`   HTTP Status:  ${res.httpStatus}`);
  } else {
    console.error(`❌ Balance check failed: ${res.error}`);
    process.exit(1);
  }
}
