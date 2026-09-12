#!/usr/bin/env node

/**
 * scripts/live-e2e/verify.mjs
 * 
 * On-Demand Live Verification Harness for QasiNet
 * 
 * Proves the FULL payment flow end-to-end:
 * real STK push -> real manual confirmation -> real Kyanda vend -> real IPN -> real receipt/token.
 * 
 * GUARDRAILS IMPLEMENTED:
 * 1. Dry-run by default (requires explicit --confirm)
 * 2. Live float check before real execution
 * 3. Paused services skipped automatically (e.g. KPLC electricity)
 * 4. Real, pre-confirmed test phone with double-entry confirmation
 * 5. Minimum viable amounts only (lowest valid price per service)
 * 6. Hard total spend ceiling (default 500 KES)
 * 7. One test at a time, sequential execution
 * 8. Emergency stop on VENDING_FAILED_REFUND_PENDING
 * 
 * Usage:
 *   # Dry Run (Safe Default):
 *   node scripts/live-e2e/verify.mjs
 * 
 *   # Review Dry Run with your phone number:
 *   node scripts/live-e2e/verify.mjs --phone=0712345678
 * 
 *   # Live Test a Single Service:
 *   node scripts/live-e2e/verify.mjs --service=safaricom-airtime --phone=0712345678 --confirm
 * 
 *   # Full Live Test Suite:
 *   node scripts/live-e2e/verify.mjs --phone=0712345678 --confirm
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { SAFETY_CONFIG, SERVICE_TEST_DEFINITIONS } from './config.mjs';
import { getLiveKyandaBalance, loadEnv } from './balance.mjs';

// Ensure .env.local is loaded
loadEnv();

// Helper for waiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Normalizes 07... / 2547... to 07...
function normalizeKenyanPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return '0' + digits.substring(3);
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return '0' + digits;
  }
  if (digits.startsWith('1') && digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}

function isValidKenyanPhone(phone) {
  const norm = normalizeKenyanPhone(phone);
  return /^(?:07|01)\d{8}$/.test(norm);
}

// Loads registry service statuses
async function loadRegistryStatuses() {
  const statuses = new Map();

  // Try direct TypeScript module import (Node 22+)
  try {
    const regModule = await import('../../src/lib/services/registry.ts');
    if (regModule?.MASTER_SERVICES) {
      for (const service of regModule.MASTER_SERVICES) {
        const status = regModule.getServiceStatus ? regModule.getServiceStatus(service.id) : service.defaultStatus;
        statuses.set(service.id, status);
      }
      return statuses;
    }
  } catch {
    // Fallback: parse src/lib/services/registry.ts directly
  }

  try {
    const regPath = path.resolve(process.cwd(), 'src/lib/services/registry.ts');
    if (fs.existsSync(regPath)) {
      const content = fs.readFileSync(regPath, 'utf8');
      const serviceBlocks = content.split(/id:\s*['"]([a-zA-Z0-9_-]+)['"]/g);
      for (let i = 1; i < serviceBlocks.length; i += 2) {
        const id = serviceBlocks[i];
        const block = serviceBlocks[i + 1] || '';
        const defaultStatusMatch = block.match(/defaultStatus:\s*['"]([a-zA-Z0-9_-]+)['"]/);
        const defaultStatus = defaultStatusMatch ? defaultStatusMatch[1] : 'enabled';
        statuses.set(id, defaultStatus);
      }
    }
  } catch (err) {
    console.warn(`[Registry Loader] Fallback parse warning: ${err.message}`);
  }

  // Sensible safety fallback if file could not be read
  if (statuses.size === 0) {
    statuses.set('kplc-prepaid', 'coming_soon');
    statuses.set('kplc-postpaid', 'coming_soon');
    statuses.set('safaricom-airtime', 'enabled');
    statuses.set('airtel-airtime', 'enabled');
    statuses.set('telkom-airtime', 'enabled');
    statuses.set('faiba-airtime', 'enabled');
    statuses.set('equitel-airtime', 'enabled');
    statuses.set('faiba-data', 'enabled');
    statuses.set('gotv', 'enabled');
    statuses.set('dstv', 'enabled');
    statuses.set('zuku', 'enabled');
    statuses.set('startimes', 'enabled');
    statuses.set('nairobi-water', 'enabled');
  }

  return statuses;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    confirm: false,
    phone: '',
    service: null,
    maxSpend: SAFETY_CONFIG.DEFAULT_MAX_SPEND_CAP,
    minFloatBuffer: SAFETY_CONFIG.MIN_FLOAT_BUFFER,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
    skipUnverified: false,
    forcePhoneConfirmed: false,
    forceSkipFloatCheck: false,
    destinationOverrides: {},
  };

  for (const arg of args) {
    if (arg === '--confirm') {
      options.confirm = true;
    } else if (arg === '--dry-run') {
      options.confirm = false;
    } else if (arg === '--skip-unverified') {
      options.skipUnverified = true;
    } else if (arg === '--force-phone-confirmed') {
      options.forcePhoneConfirmed = true;
    } else if (arg === '--force-skip-float-check') {
      options.forceSkipFloatCheck = true;
    } else if (arg.startsWith('--phone=')) {
      options.phone = normalizeKenyanPhone(arg.split('=')[1]);
    } else if (arg.startsWith('--service=')) {
      options.service = arg.split('=')[1].trim().toLowerCase();
    } else if (arg.startsWith('--max-spend=')) {
      options.maxSpend = parseFloat(arg.split('=')[1]) || SAFETY_CONFIG.DEFAULT_MAX_SPEND_CAP;
    } else if (arg.startsWith('--min-float-buffer=')) {
      options.minFloatBuffer = parseFloat(arg.split('=')[1]) || SAFETY_CONFIG.MIN_FLOAT_BUFFER;
    } else if (arg.startsWith('--app-url=')) {
      options.appUrl = arg.split('=')[1].trim().replace(/\/+$/, '');
    } else if (arg.startsWith('--dest-')) {
      const parts = arg.substring(7).split('=');
      if (parts.length === 2) {
        options.destinationOverrides[parts[0].toLowerCase()] = parts[1].trim();
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
=============================================================================
  QASINET ON-DEMAND LIVE VERIFICATION HARNESS (E2E)
=============================================================================

This harness executes real, full-stack payment cycles against the live
system (M-Pesa STK push -> customer approval -> Kyanda vend -> IPN receipt).

GUARDRAILS:
  - Dry-run by default: no action taken without --confirm
  - Live float check before initiating transactions
  - Paused services automatically detected and skipped (e.g. KPLC electricity)
  - Hard spend ceiling enforcement
  - Emergency halt if any transaction lands in refund-pending

USAGE:
  node scripts/live-e2e/verify.mjs [OPTIONS]

OPTIONS:
  --dry-run                 Simulate run and print execution plan (DEFAULT)
  --confirm                 REQUIRED to execute real transactions with real money
  --phone=07XXXXXXXX        The paying M-Pesa phone number receiving the STK push
  --service=<slug>          Run only one service (e.g. safaricom-airtime, gotv)
  --skip-unverified         Skip services lacking pre-confirmed live SIMs
  --max-spend=<KES>         Override hard spend cap (default: ${SAFETY_CONFIG.DEFAULT_MAX_SPEND_CAP} KES)
  --min-float-buffer=<KES>  Required Kyanda float buffer (default: ${SAFETY_CONFIG.MIN_FLOAT_BUFFER} KES)
  --app-url=<url>           Application base URL (default: http://localhost:4000)

DESTINATION OVERRIDES:
  --dest-airtel=07XXXXXXXX  Destination phone for Airtel Airtime
  --dest-telkom=07XXXXXXXX  Destination phone for Telkom Airtime
  --dest-equitel=07XXXXXXXX Destination phone for Equitel Airtime
  --dest-faiba=0747XXXXXX   Destination phone for Faiba Airtime/Bundles
  --dest-gotv=<decoder>     GOtv decoder IUC number (default: 2019283746)
  --dest-dstv=<smartcard>   DStv smartcard number (default: 1029384756)
  --dest-zuku=<account>     Zuku account number (default: 3049586721)
  --dest-startimes=<card>   StarTimes smartcard number (default: 0192837465)
  --dest-water=<account>    Nairobi Water account (default: 1234567)

EXAMPLES:
  # 1. Preview what would be executed and cost:
  node scripts/live-e2e/verify.mjs

  # 2. Test only Safaricom Airtime (spend KES 10):
  node scripts/live-e2e/verify.mjs --service=safaricom-airtime --phone=0712345678 --confirm

  # 3. Test only GOtv renewal (spend KES 50):
  node scripts/live-e2e/verify.mjs --service=gotv --phone=0712345678 --confirm
`);
}

// Main execution function
async function main() {
  const options = parseArgs();
  const startTime = new Date();

  console.log('=============================================================================');
  console.log('  QASINET ON-DEMAND LIVE VERIFICATION HARNESS');
  console.log(`  Timestamp:   ${startTime.toISOString()}`);
  console.log(`  Target App:  ${options.appUrl}`);
  console.log(`  Mode:        ${options.confirm ? '🔴 LIVE REAL-MONEY EXECUTION' : '🟢 SAFE DRY-RUN (Default)'}`);
  console.log('=============================================================================');

  // 1. Load Registry Statuses (Guardrail 3)
  const registryStatuses = await loadRegistryStatuses();

  // 2. Build Test Plan
  const plan = [];
  let totalPlannedSpend = 0;

  for (const def of SERVICE_TEST_DEFINITIONS) {
    if (options.service && def.serviceSlug !== options.service) {
      continue;
    }

    const regStatus = registryStatuses.get(def.serviceSlug) || 'enabled';
    const isPaused = regStatus === 'coming_soon' || regStatus === 'hidden';

    // Resolve test destination
    let destination = def.defaultDestination;
    if (def.destinationType === 'paying_phone') {
      destination = options.phone || '<TEST_PHONE>';
    }

    // Apply destination overrides if specified
    if (def.serviceSlug.includes('airtel') && options.destinationOverrides.airtel) {
      destination = options.destinationOverrides.airtel;
    } else if (def.serviceSlug.includes('telkom') && options.destinationOverrides.telkom) {
      destination = options.destinationOverrides.telkom;
    } else if (def.serviceSlug.includes('equitel') && options.destinationOverrides.equitel) {
      destination = options.destinationOverrides.equitel;
    } else if (def.serviceSlug.includes('faiba') && options.destinationOverrides.faiba) {
      destination = options.destinationOverrides.faiba;
    } else if (def.serviceSlug === 'gotv' && options.destinationOverrides.gotv) {
      destination = options.destinationOverrides.gotv;
    } else if (def.serviceSlug === 'dstv' && options.destinationOverrides.dstv) {
      destination = options.destinationOverrides.dstv;
    } else if (def.serviceSlug === 'zuku' && options.destinationOverrides.zuku) {
      destination = options.destinationOverrides.zuku;
    } else if (def.serviceSlug === 'startimes' && options.destinationOverrides.startimes) {
      destination = options.destinationOverrides.startimes;
    } else if (def.serviceSlug === 'nairobi-water' && options.destinationOverrides.water) {
      destination = options.destinationOverrides.water;
    }

    let action = 'RUN';
    let skipReason = null;

    if (isPaused) {
      action = 'SKIP';
      skipReason = `Paused in service registry (status: ${regStatus})`;
    } else if (options.skipUnverified && !def.hasKnownGoodTestAccount) {
      action = 'SKIP';
      skipReason = 'Skipped via --skip-unverified (no confirmed live test SIM)';
    }

    if (action === 'RUN') {
      totalPlannedSpend += def.amount;
    }

    plan.push({
      ...def,
      resolvedDestination: destination,
      registryStatus: regStatus,
      action,
      skipReason,
    });
  }

  if (plan.length === 0) {
    console.log(`\n❌ Error: No services found matching criteria (service: ${options.service || 'all'}).`);
    process.exit(1);
  }

  // 3. Print Planned Execution Table
  console.log('\nPLANNED SERVICE TEST RUN:');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'Service'.padEnd(20) +
    'Category'.padEnd(12) +
    'Amount'.padEnd(10) +
    'Destination'.padEnd(16) +
    'Action'.padEnd(8) +
    'Notes / Details'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  for (const item of plan) {
    const actionColor = item.action === 'RUN' ? '✅ RUN' : '⏭️ SKIP';
    console.log(
      item.serviceSlug.padEnd(20) +
      item.category.padEnd(12) +
      `KES ${item.amount}`.padEnd(10) +
      (item.resolvedDestination || 'N/A').padEnd(16) +
      actionColor.padEnd(8) +
      (item.skipReason ? `[${item.skipReason}]` : item.notes)
    );
  }
  console.log('---------------------------------------------------------------------------------------------------------');

  const activeTests = plan.filter((t) => t.action === 'RUN');
  const skippedTests = plan.filter((t) => t.action === 'SKIP');

  console.log(`\nSUMMARY OF PLANNED RUN:`);
  console.log(`- Total Services Evaluated: ${plan.length}`);
  console.log(`- Services to Test (Active): ${activeTests.length}`);
  console.log(`- Services Skipped (Paused): ${skippedTests.length}`);
  console.log(`- Total Planned Real Spend: KES ${totalPlannedSpend.toLocaleString()}`);
  console.log(`- Spend Safety Ceiling:     KES ${options.maxSpend.toLocaleString()}`);
  console.log(`- Required Float Buffer:    KES ${options.minFloatBuffer.toLocaleString()}`);

  // 4. Guardrail 6: Hard Spend Cap Enforcement
  if (totalPlannedSpend > options.maxSpend) {
    console.error(`\n❌ SAFETY LIMIT EXCEEDED: Planned spend (KES ${totalPlannedSpend}) exceeds safety ceiling (KES ${options.maxSpend}).`);
    console.error(`Refusing to proceed. Reduce test scope with --service=<slug> or increase --max-spend=<KES>.`);
    process.exit(1);
  }

  // =========================================================================
  // DRY RUN TERMINATION (Guardrail 1)
  // =========================================================================
  if (!options.confirm) {
    console.log('\n-----------------------------------------------------------------------------');
    console.log('🛡️  DRY RUN COMPLETE — NO MONEY SPENT, NO TRANSACTIONS CREATED');
    console.log('-----------------------------------------------------------------------------');
    console.log('To execute this test suite for real, provide your paying M-Pesa phone and pass --confirm:');
    console.log(`\n  node scripts/live-e2e/verify.mjs --phone=${options.phone || '07XXXXXXXX'} --confirm\n`);
    console.log('Or test a single specific service first (e.g. Safaricom Airtime for KES 10):');
    console.log(`  node scripts/live-e2e/verify.mjs --service=safaricom-airtime --phone=${options.phone || '07XXXXXXXX'} --confirm\n`);
    process.exit(0);
  }

  // =========================================================================
  // LIVE RUN PREREQUISITES & GUARDRAILS
  // =========================================================================
  console.log('\n=============================================================================');
  console.log('⚠️  PREPARING LIVE REAL-MONEY TRANSACTION EXECUTION');
  console.log('=============================================================================');

  // Guardrail 4: Valid paying phone number is required
  if (!options.phone || !isValidKenyanPhone(options.phone)) {
    console.error(`\n❌ Error: A valid Kenyan M-Pesa phone number is required for live execution.`);
    console.error(`Provide your phone using: --phone=07XXXXXXXX (e.g. 0712345678).`);
    process.exit(1);
  }

  const payingPhone = options.phone;

  // Guardrail 4: Interactive Confirmation Prompt (Second Entry)
  if (!options.forcePhoneConfirmed) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n⚠️  SAFETY CHECK: You are about to initiate REAL transactions spending up to KES ${totalPlannedSpend}.`);
    console.log(`STK Push prompts will be sent to your phone: ${payingPhone}`);
    console.log(`Please type your phone number again to confirm authorization:`);

    const enteredPhone = await new Promise((resolve) => {
      rl.question('> ', (answer) => {
        rl.close();
        resolve(normalizeKenyanPhone(answer.trim()));
      });
    });

    if (enteredPhone !== payingPhone) {
      console.error(`\n❌ Confirmation failed: Entered phone (${enteredPhone}) did not match target phone (${payingPhone}).`);
      console.error(`Aborting live test run. No transactions were created.`);
      process.exit(1);
    }

    console.log(`\n✅ Phone confirmed: ${payingPhone}. Proceeding to float pre-check...`);
  }

  // Guardrail 2: Live Float Pre-Check
  console.log('\nChecking live Kyanda merchant float balance...');
  const balanceResult = await getLiveKyandaBalance();
  const requiredFloat = totalPlannedSpend + options.minFloatBuffer;

  if (balanceResult.success) {
    console.log(`- Kyanda Account Balance:  KES ${balanceResult.accountBal.toLocaleString()}`);
    console.log(`- Kyanda Earnings Balance: KES ${balanceResult.earningsBal.toLocaleString()}`);
    console.log(`- Required Float Total:    KES ${requiredFloat.toLocaleString()} (Spend: ${totalPlannedSpend} + Buffer: ${options.minFloatBuffer})`);

    if (balanceResult.accountBal < requiredFloat) {
      console.error(`\n❌ ABORTED: Insufficient Kyanda merchant float!`);
      console.error(`Available Account_Bal: KES ${balanceResult.accountBal}`);
      console.error(`Required Total:        KES ${requiredFloat}`);
      console.error(`Deficit:               KES ${(requiredFloat - balanceResult.accountBal).toFixed(2)}`);
      console.error(`Top up merchant float before running live tests to prevent transactions landing in refund-pending.`);
      process.exit(1);
    }
    console.log('✅ Float check passed: Float is sufficient for full test run.');
  } else {
    console.warn(`\n⚠️  Float Check Warning: Could not verify float directly with gateway (${balanceResult.error}).`);
    if (!options.forceSkipFloatCheck) {
      console.error(`Aborting as a safety precaution. To bypass if testing via local proxy, pass --force-skip-float-check.`);
      process.exit(1);
    }
  }

  // =========================================================================
  // SEQUENTIAL TEST EXECUTION (Guardrail 7)
  // =========================================================================
  console.log('\n=============================================================================');
  console.log(`🚀 STARTING LIVE SEQUENTIAL VERIFICATION (${activeTests.length} tests queued)`);
  console.log('=============================================================================');

  const results = [];
  let hadRefundPendingStop = false;

  for (let idx = 0; idx < activeTests.length; idx++) {
    const test = activeTests[idx];
    const testNum = idx + 1;

    console.log(`\n-----------------------------------------------------------------------------`);
    console.log(`[TEST ${testNum}/${activeTests.length}] ${test.serviceSlug} (${test.name})`);
    console.log(`-----------------------------------------------------------------------------`);
    console.log(`Service:        ${test.name} (${test.serviceSlug})`);
    console.log(`Amount:         KES ${test.amount}`);
    console.log(`Destination:    ${test.resolvedDestination}`);
    console.log(`Paying Phone:   ${payingPhone}`);
    console.log(`Product ID:     ${test.productId || 'N/A'}`);
    console.log(`Timestamp:      ${new Date().toLocaleTimeString()}`);

    const testRecord = {
      serviceSlug: test.serviceSlug,
      name: test.name,
      amount: test.amount,
      destination: test.resolvedDestination,
      status: 'INITIALIZING',
      reference: null,
      mpesaReceipt: null,
      kyandaRef: null,
      confirmationData: null,
      failureReason: null,
      durationMs: 0,
    };

    const testStartTime = Date.now();

    // -----------------------------------------------------------------------
    // Step 1: Initiate Transaction via Real Backend API
    // -----------------------------------------------------------------------
    console.log(`\n1. Calling POST ${options.appUrl}/api/transactions ...`);
    const idempotencyKey = `live-e2e-${test.serviceSlug}-${Date.now()}`;
    const payload = {
      serviceSlug: test.serviceSlug,
      productId: test.productId || undefined,
      destination: test.resolvedDestination,
      amount: test.amount,
      guestPhone: payingPhone,
    };

    let initRes;
    try {
      const resp = await fetch(`${options.appUrl}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      initRes = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(initRes.error?.message || initRes.error || `HTTP ${resp.status}`);
      }
    } catch (err) {
      console.error(`❌ Initiation Failed: ${err.message}`);
      testRecord.status = 'INITIATION_FAILED';
      testRecord.failureReason = err.message;
      testRecord.durationMs = Date.now() - testStartTime;
      results.push(testRecord);
      continue;
    }

    const tx = initRes.transaction;
    testRecord.reference = tx.reference;
    console.log(`✅ Initiated successfully!`);
    console.log(`   QasiNet Reference: ${tx.reference}`);
    console.log(`   Amount Payable:    KES ${tx.payable || tx.amount}`);

    // -----------------------------------------------------------------------
    // Step 2 & 3: STK Push Dispatched & Wait for Manual Approval
    // -----------------------------------------------------------------------
    console.log(`\n2. M-Pesa STK Push dispatched to ${payingPhone} at ${new Date().toLocaleTimeString()}.`);
    console.log(`📱 ACTION REQUIRED ON PHONE:`);
    console.log(`   Please unlock your phone (${payingPhone}) and enter your M-Pesa PIN now.`);
    console.log(`   Waiting for customer authorization (timeout: ${SAFETY_CONFIG.STK_APPROVAL_TIMEOUT_MS / 1000}s)...`);

    const pollStartTime = Date.now();
    let paymentApproved = false;
    let paymentFailed = false;

    while (Date.now() - pollStartTime < SAFETY_CONFIG.STK_APPROVAL_TIMEOUT_MS) {
      await sleep(SAFETY_CONFIG.POLL_INTERVAL_MS);
      const elapsed = Math.round((Date.now() - pollStartTime) / 1000);

      try {
        const statusRes = await fetch(`${options.appUrl}/api/transactions/${tx.reference}/status`);
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();

        const state = statusData.state;
        if (state === 'PAYMENT_CONFIRMED' || state === 'VENDING_PENDING' || state === 'PROCESSING' || state === 'SUCCESS') {
          console.log(`\n💳 [${elapsed}s] M-Pesa Payment Confirmed!`);
          if (statusData.paymentRef) {
            console.log(`   M-Pesa Receipt Code: ${statusData.paymentRef}`);
            testRecord.mpesaReceipt = statusData.paymentRef;
          }
          paymentApproved = true;
          break;
        }

        if (state === 'PAYMENT_FAILED') {
          console.log(`\n❌ [${elapsed}s] Payment Failed or Cancelled on phone.`);
          testRecord.status = 'PAYMENT_FAILED';
          testRecord.failureReason = statusData.message || 'M-Pesa PIN cancelled or timeout on user device';
          paymentFailed = true;
          break;
        }

        process.stdout.write(`   ⏳ Waiting for PIN entry... (${elapsed}s elapsed)\r`);
      } catch (pollErr) {
        // network blip during polling, continue
      }
    }

    if (paymentFailed) {
      testRecord.durationMs = Date.now() - testStartTime;
      results.push(testRecord);
      continue;
    }

    if (!paymentApproved) {
      console.log(`\n❌ STK Approval Timeout: PIN was not entered within ${SAFETY_CONFIG.STK_APPROVAL_TIMEOUT_MS / 1000}s.`);
      testRecord.status = 'STK_TIMEOUT';
      testRecord.failureReason = 'Customer did not enter PIN in time';
      testRecord.durationMs = Date.now() - testStartTime;
      results.push(testRecord);
      continue;
    }

    // -----------------------------------------------------------------------
    // Step 4: Wait for Kyanda Vending & Fulfillment (Terminal State Resolution)
    // -----------------------------------------------------------------------
    console.log(`\n3. Waiting for upstream Kyanda fulfillment & IPN delivery (timeout: ${SAFETY_CONFIG.VENDING_TIMEOUT_MS / 1000}s)...`);
    const vendingStartTime = Date.now();
    let terminalResolved = false;

    while (Date.now() - vendingStartTime < SAFETY_CONFIG.VENDING_TIMEOUT_MS) {
      await sleep(SAFETY_CONFIG.POLL_INTERVAL_MS);
      const elapsed = Math.round((Date.now() - vendingStartTime) / 1000);

      try {
        const statusRes = await fetch(`${options.appUrl}/api/transactions/${tx.reference}/status`);
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();

        const state = statusData.state;
        const message = statusData.message || '';

        if (statusData.paymentRef) {
          testRecord.mpesaReceipt = statusData.paymentRef;
        }
        if (statusData.providerRef) {
          testRecord.kyandaRef = statusData.providerRef;
        }

        // Check for SUCCESS
        if (state === 'SUCCESS') {
          console.log(`\n🎉 [${elapsed}s] VENDING COMPLETED SUCCESSFULLY!`);
          testRecord.status = 'SUCCESS';
          testRecord.confirmationData = {
            state: statusData.state,
            reference: statusData.reference,
            providerRef: statusData.providerRef,
            paymentRef: statusData.paymentRef,
            metadata: statusData.metadata,
          };

          // Print raw confirmation data
          console.log('\n--- RAW CONFIRMATION PAYLOAD RECEIVED ---');
          console.log(JSON.stringify(testRecord.confirmationData, null, 2));
          console.log('-----------------------------------------\n');

          terminalResolved = true;
          break;
        }

        // Check for REFUND PENDING (Guardrail 8 - Critical Halt)
        if (
          state === 'VENDING_FAILED_REFUND_PENDING' ||
          state === 'REFUND_PENDING' ||
          message.includes('[REFUND_PENDING]') ||
          message.toLowerCase().includes('refund')
        ) {
          console.log(`\n🚨🚨🚨 [${elapsed}s] CRITICAL ALERT: TRANSACTION ENTERED REFUND PENDING! 🚨🚨🚨`);
          console.log('=============================================================================');
          console.log(`Real customer money was debited from M-Pesa, but Kyanda fulfillment failed.`);
          console.log(`Reference:      ${tx.reference}`);
          console.log(`M-Pesa Receipt: ${statusData.paymentRef || testRecord.mpesaReceipt || 'N/A'}`);
          console.log(`Kyanda Ref:     ${statusData.providerRef || 'N/A'}`);
          console.log(`Service:        ${test.serviceSlug}`);
          console.log(`Amount:         KES ${test.amount}`);
          console.log(`Failure Reason: ${message || statusData.state}`);
          console.log(`Admin Audit:    ${options.appUrl}/admin/transactions/${tx.reference}`);
          console.log('=============================================================================');
          console.log('🛑 OPERATOR ACTION REQUIRED:');
          console.log('Per Guardrail 8, this harness stops immediately. Do NOT run further tests.');
          console.log('Manually initiate a refund to the customer via M-Pesa B2C payout or support channels.');
          console.log('=============================================================================\n');

          testRecord.status = 'VENDING_FAILED_REFUND_PENDING';
          testRecord.failureReason = message || 'Upstream vending failed after payment';
          testRecord.confirmationData = statusData;
          terminalResolved = true;
          hadRefundPendingStop = true;
          break;
        }

        process.stdout.write(`   ⏳ Processing vending upstream... (${elapsed}s elapsed, state: ${state})\r`);
      } catch (pollErr) {
        // network blip during polling, continue
      }
    }

    testRecord.durationMs = Date.now() - testStartTime;
    results.push(testRecord);

    if (!terminalResolved) {
      console.log(`\n⏳ Vending Resolution Timeout: Transaction is still in progress after ${SAFETY_CONFIG.VENDING_TIMEOUT_MS / 1000}s.`);
      console.log(`Inspect status manually at: ${options.appUrl}/admin/transactions/${tx.reference}`);
      testRecord.status = 'VENDING_TIMEOUT';
    }

    // If a transaction entered refund pending, STOP entire test run immediately
    if (hadRefundPendingStop) {
      break;
    }

    // Small breather between sequential tests
    if (idx < activeTests.length - 1) {
      console.log('\nPausing 5 seconds before next sequential test...');
      await sleep(5000);
    }
  }

  // =========================================================================
  // FINAL REPORT
  // =========================================================================
  const endTime = new Date();
  const totalDurationSecs = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  console.log('\n=============================================================================');
  console.log('  FINAL LIVE VERIFICATION HARNESS REPORT');
  console.log('=============================================================================');
  console.log(`Start Time:     ${startTime.toISOString()}`);
  console.log(`End Time:       ${endTime.toISOString()}`);
  console.log(`Total Duration: ${totalDurationSecs}s`);
  console.log('-----------------------------------------------------------------------------');

  const passedCount = results.filter((r) => r.status === 'SUCCESS').length;
  const refundPendingCount = results.filter((r) => r.status === 'VENDING_FAILED_REFUND_PENDING').length;
  const failedCount = results.filter((r) => r.status !== 'SUCCESS' && r.status !== 'VENDING_FAILED_REFUND_PENDING').length;

  console.log(`RESULTS SUMMARY:`);
  console.log(`- Total Tests Run:       ${results.length}`);
  console.log(`- ✅ PASSED (Fulfilled):  ${passedCount}`);
  console.log(`- 🚨 REFUND PENDING:     ${refundPendingCount}`);
  console.log(`- ❌ FAILED / TIMEOUT:   ${failedCount}`);
  console.log(`- ⏭️ SKIPPED (Paused):   ${skippedTests.length}`);

  console.log('\nDETAILED OUTCOME TABLE:');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'Service'.padEnd(20) +
    'Amount'.padEnd(10) +
    'Reference'.padEnd(24) +
    'M-Pesa Code'.padEnd(14) +
    'Status'.padEnd(20) +
    'Details'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  for (const r of results) {
    console.log(
      r.serviceSlug.padEnd(20) +
      `KES ${r.amount}`.padEnd(10) +
      (r.reference || 'N/A').padEnd(24) +
      (r.mpesaReceipt || 'N/A').padEnd(14) +
      r.status.padEnd(20) +
      (r.failureReason || (r.status === 'SUCCESS' ? 'Fulfillment verified' : ''))
    );
  }
  console.log('---------------------------------------------------------------------------------------------------------');

  if (refundPendingCount > 0) {
    console.log('\n🚨 ATTENTION: REFUND-PENDING TRANSACTIONS REQUIRING MANUAL ACTION:');
    for (const r of results.filter((x) => x.status === 'VENDING_FAILED_REFUND_PENDING')) {
      console.log(`  - Reference: ${r.reference} | M-Pesa: ${r.mpesaReceipt} | Amount: KES ${r.amount} | Service: ${r.serviceSlug}`);
      console.log(`    Admin URL: ${options.appUrl}/admin/transactions/${r.reference}`);
    }
  }

  console.log('\n=============================================================================\n');

  if (refundPendingCount > 0) {
    process.exit(2);
  } else if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\n❌ Unhandled Fatal Error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
