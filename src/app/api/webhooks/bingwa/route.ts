import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';

/**
 * Bingwa Sokoni Reseller Webhook Handler
 * 
 * Ingests asynchronous delivery and status callbacks from the reseller till platform.
 * NOTE: White-labeling rule: Never leak upstream vendor details to public responses.
 */
interface ResellerWebhookBody {
  reference?: string;
  qsn_reference?: string;
  transaction_id?: string;
  provider_reference?: string;
  mpesa_reference?: string;
  phone?: string;
  phone_number?: string;
  amount?: number | string;
  status?: boolean | string;
  code?: number | string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

interface MatchingTransaction {
  id: string;
  qsn_reference: string;
  status: string;
  amount: number;
  destination: string;
  kyanda_reference?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    let payload: ResellerWebhookBody;
    try {
      payload = (await req.json()) as ResellerWebhookBody;
    } catch {
      return NextResponse.json({ status: 'error', message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Webhook Secret Verification (if configured in environment)
    const expectedSecret = process.env.BINGWA_WEBHOOK_SECRET;
    if (expectedSecret) {
      const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-api-key');
      const authHeader = req.headers.get('authorization');
      const querySecret = req.nextUrl.searchParams.get('secret');
      const isBearerMatch = authHeader === `Bearer ${expectedSecret}`;
      const isSecretMatch = headerSecret === expectedSecret || querySecret === expectedSecret || isBearerMatch;
      if (!isSecretMatch) {
        console.warn('[Reseller Webhook] Unauthorized webhook callback rejected.');
        return NextResponse.json({ status: 'error', message: 'Unauthorized webhook' }, { status: 401 });
      }
    }

    console.log('[Reseller Webhook] Callback received:', JSON.stringify(payload));

    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const orchestrator = new TransactionOrchestrator(supabaseService);

    // Extract identifiers from callback
    const reference = payload?.reference || payload?.qsn_reference;
    const providerRef = payload?.transaction_id || payload?.provider_reference || payload?.mpesa_reference;
    const phone = payload?.phone || payload?.phone_number;
    const amount = payload?.amount ? Number(payload.amount) : undefined;
    const isSuccess = 
      payload?.status === true || 
      payload?.status === 'success' || 
      payload?.status === 'SUCCESS' || 
      payload?.status === 'completed' || 
      payload?.code === 0 || 
      payload?.code === '0000';

    // 1. Attempt lookup by QasiNet reference
    let tx: MatchingTransaction | null = null;
    if (reference) {
      const { data } = await supabaseService
        .from('transactions')
        .select('id, qsn_reference, status, amount, destination, kyanda_reference')
        .eq('qsn_reference', reference)
        .maybeSingle<MatchingTransaction>();
      tx = data;
    }

    // 2. Attempt lookup by provider reference
    if (!tx && providerRef) {
      const { data } = await supabaseService
        .from('transactions')
        .select('id, qsn_reference, status, amount, destination, kyanda_reference')
        .eq('kyanda_reference', providerRef)
        .maybeSingle<MatchingTransaction>();
      tx = data;
    }

    // 3. Fallback lookup by destination phone and amount in pending states
    if (!tx && phone && amount) {
      const normalizedPhone = phone.replace(/[^0-9]/g, '');
      const { data } = await supabaseService
        .from('transactions')
        .select('id, qsn_reference, status, amount, destination, kyanda_reference')
        .in('status', ['VENDING_PENDING', 'PAYMENT_CONFIRMED', 'PAYMENT_PENDING'])
        .eq('amount', amount)
        .or(`destination.eq.${normalizedPhone},destination.eq.0${normalizedPhone.slice(-9)}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<MatchingTransaction>();
      tx = data;
    }

    if (!tx) {
      console.warn('[Reseller Webhook] No matching pending transaction found for payload:', payload);
      // Return 200 OK so upstream webhook doesn't repeatedly retry
      return NextResponse.json({ status: 'ignored', message: 'Transaction not found or already processed' });
    }

    // If transaction is already in final state, acknowledge and return
    if (tx.status === 'SUCCESS' || tx.status === 'VENDING_FAILED_REFUND_PENDING' || tx.status === 'PAYMENT_FAILED') {
      console.log(`[Reseller Webhook] Transaction ${tx.qsn_reference} is already in terminal state ${tx.status}`);
      return NextResponse.json({ status: 'ok', message: 'Already processed' });
    }

    if (isSuccess) {
      console.log(`[Reseller Webhook] Confirming bundle fulfillment for ${tx.qsn_reference}`);
      await orchestrator.finalizeTransaction(
        tx.id,
        true,
        undefined,
        providerRef || tx.kyanda_reference || `RES-${Date.now()}`,
        {
          webhook_delivered_at: new Date().toISOString(),
          provider_payload: payload,
        }
      );
    } else {
      const failureReason = payload?.message || payload?.error || 'Bundle delivery failed on network';
      console.warn(`[Reseller Webhook] Bundle delivery failed for ${tx.qsn_reference}: ${failureReason}`);
      await orchestrator.finalizeTransaction(
        tx.id,
        false,
        failureReason,
        providerRef || tx.kyanda_reference || undefined,
        { provider_payload: payload },
        'VENDING_FAILED_REFUND_PENDING'
      );
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: unknown) {
    console.error('[Reseller Webhook] Unhandled exception:', error);
    return NextResponse.json({ status: 'error', message: 'Internal processing error' }, { status: 500 });
  }
}
