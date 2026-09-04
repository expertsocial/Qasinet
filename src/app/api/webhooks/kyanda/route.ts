import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaSignatureEngine } from '@/lib/providers/kyanda/signature';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const kyandaMerchantId = process.env.KYANDA_MERCHANT_ID || '';
const kyandaSecurityKey = process.env.KYANDA_SECURITY_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const orchestrator = new TransactionOrchestrator(supabase);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const { transactionRef, merchant_reference, reference, Status, status, status_code, message, signature } = payload;
    const providerReference = transactionRef || merchant_reference || reference;
    const finalStatus = Status || status || (status_code === '0000' || status_code === '1100' ? 'Success' : 'Failed'); 

    if (!providerReference) {
      console.warn('[Kyanda Webhook] Missing transaction reference in payload:', payload);
      return NextResponse.json({ status: 'ignored', message: 'Missing transaction reference' }, { status: 200 });
    }

    // 1. Signature or Merchant Verification
    if (signature) {
      const isValidSignature = KyandaSignatureEngine.verifyCallbackSignature(
        kyandaMerchantId,
        providerReference,
        finalStatus,
        signature,
        kyandaSecurityKey
      );

      if (!isValidSignature) {
        console.error(`[Kyanda Webhook] Invalid webhook signature for ref: ${providerReference}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      // If no signature is provided in IPN, verify MerchantID if present
      const payloadMerchantId = payload.MerchantID || payload.merchant_id || payload.merchantId;
      if (payloadMerchantId && kyandaMerchantId && payloadMerchantId.toLowerCase() !== kyandaMerchantId.toLowerCase()) {
        console.error(`[Kyanda Webhook] Unauthorized merchant ID: ${payloadMerchantId}`);
        return NextResponse.json({ error: 'Unauthorized merchant' }, { status: 401 });
      }
    }

    // 2. Idempotency Check
    const { error: insertError } = await supabase.from('webhook_events').insert({
      provider: 'KYANDA',
      event_type: 'IPN',
      provider_reference: providerReference,
      status: finalStatus,
      payload: payload,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ status: 'success', message: 'Duplicate webhook ignored' }, { status: 200 });
      }
      console.error('[Kyanda Webhook] Failed to log webhook_events. Continuing processing safely.');
    }

    // 3. Lookup QasiNet Transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('kyanda_reference', providerReference)
      .single();

    if (txError || !tx) {
      return NextResponse.json({ status: 'success', message: 'Unknown transaction' }, { status: 200 });
    }

    // 4. Process Transaction State
    // Only process if it is pending vending to avoid duplicate processing of terminal states.
    if (tx.status === 'VENDING_PENDING') {
      let isSuccess = false;
      const detailStatus = payload.details?.Status || payload.details?.status;
      
      if (detailStatus) {
        isSuccess = (detailStatus === 'Success' || detailStatus === '0000');
      } else if (status_code) {
        // 0000 is success, 1100 is transaction pending/processing
        isSuccess = (status_code === '0000' || status_code === '1100');
      } else {
        isSuccess = (finalStatus === 'Success' || finalStatus === '0000');
      }

      const reason = isSuccess ? undefined : message || payload.transactiontxt || finalStatus || 'Failed';

      // Extract metadata like tokens, units, receipts if present
      const metadata: any = {};
      const token = payload.Token || payload.token || payload.details?.Token || payload.details?.token;
      const units = payload.Units || payload.units || payload.details?.Units || payload.details?.units;
      const receipt = payload.Receipt || payload.receipt || payload.details?.Receipt || payload.details?.receipt;

      if (token) metadata.token = token;
      if (units) metadata.units = units;
      if (receipt) metadata.receipt = receipt;
      if (payload.details) metadata.providerDetails = payload.details;

      await orchestrator.finalizeTransaction(
        tx.id, 
        isSuccess, 
        reason, 
        providerReference, 
        Object.keys(metadata).length > 0 ? metadata : undefined
      );
    } else {
      // It's already in a terminal state, just acknowledge.
      console.log(`Webhook received for transaction ${tx.id} but state is ${tx.status}. Ignored.`);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    // Avoid logging the raw payload as it might contain sensitive info if malformed
    console.error('Webhook processing error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
