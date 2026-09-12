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

  return new Promise((resolve) => {
    const url = new URL('/billing/v1/account-balance', baseUrl);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'apiKey': apiKey,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const accountBal = parseFloat(parsed.Account_Bal || '0');
            const earningsBal = parseFloat(parsed.Earnings_Bal || '0');
            const isSuccess = parsed.status_code === '0000' || parsed.status === 'success' || !isNaN(accountBal);

            resolve({
              success: isSuccess,
              accountBal: isNaN(accountBal) ? 0 : accountBal,
              earningsBal: isNaN(earningsBal) ? 0 : earningsBal,
              raw: parsed,
              httpStatus: res.statusCode,
            });
          } catch (err) {
            resolve({
              success: false,
              error: `Invalid JSON response from gateway: ${body.substring(0, 100)}`,
              accountBal: 0,
              earningsBal: 0,
              raw: body,
              httpStatus: res.statusCode,
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: `Gateway connection timed out after ${timeoutMs / 1000}s`,
        accountBal: 0,
        earningsBal: 0,
        raw: null,
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: `Network error connecting to Kyanda gateway: ${err.message}`,
        accountBal: 0,
        earningsBal: 0,
        raw: null,
      });
    });

    req.write(payload);
    req.end();
  });
}
