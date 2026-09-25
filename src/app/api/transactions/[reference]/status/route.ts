import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { MpesaDarajaProvider } from '@/lib/providers/mpesa/provider';
import { executeVendingForTransaction } from '@/lib/services/vending';

// Debounce map for outbound Daraja STK queries to avoid spamming Safaricom on fast status polling
const lastDarajaQueryMap = new Map<string, number>();
const DARAJA_QUERY_DEBOUNCE_MS = 15000; // Minimum 15s between STK queries for the same transaction

// Basic in-memory rate limiter (Warning: Resets on serverless cold starts)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { reference } = await params;
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, qsn_reference, status, amount, selling_price, destination, payment_reference, kyanda_reference, failure_reason, created_at, updated_at, services(name, slug, type)')
      .eq('qsn_reference', reference)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch latest event details for tokens, units, receipts
    const { data: latestEvent } = await supabase
      .from('transaction_events')
      .select('details')
      .eq('transaction_id', tx.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let currentStatus = tx.status;
    let kyandaRef = tx.kyanda_reference;
    const metadata: any = latestEvent?.details || {};

    // On-demand reconciliation for PAYMENT_PENDING (auto-resolve expired/declined prompts)
    if (tx.status === 'PAYMENT_PENDING') {
      const createdAt = new Date(tx.created_at).getTime();
      const now = Date.now();
      const ageMs = now - createdAt;

      // Reconcile if prompt was initiated at least 5 seconds ago
      if (ageMs > 5000) {
        const lastQuery = lastDarajaQueryMap.get(tx.id) || 0;
        if (now - lastQuery >= DARAJA_QUERY_DEBOUNCE_MS) {
          lastDarajaQueryMap.set(tx.id, now);

          if (!tx.payment_reference) {
            if (ageMs > 3 * 60 * 1000) {
              const orchestrator = new TransactionOrchestrator(supabase);
              await orchestrator.updatePaymentState(
                tx.id,
                'PAYMENT_FAILED',
                undefined,
                'M-Pesa STK prompt was not dispatched or failed'
              );
              currentStatus = 'PAYMENT_FAILED';
              tx.failure_reason = 'M-Pesa STK prompt was not dispatched or failed';
            }
          } else {
            try {
              console.log(`[On-Demand Reconciliation] Querying Daraja STK status for ${reference} (${tx.payment_reference})`);
              const mpesaProvider = new MpesaDarajaProvider();
              const queryRes = await mpesaProvider.querySTKStatus(tx.payment_reference);

              const orchestrator = new TransactionOrchestrator(supabase);
              if (queryRes.ResultCode === '0') {
                console.log(`[On-Demand Reconciliation] STK confirmed paid for ${reference}. Immediately executing vending.`);
                await orchestrator.updatePaymentState(tx.id, 'PAYMENT_CONFIRMED', tx.payment_reference);
                await orchestrator.authorizeVending(tx.id);
                
                // Immediately execute vending for sub-5s resolution
                const vendRes = await executeVendingForTransaction(tx.id, supabase);
                currentStatus = vendRes.status;
                if (vendRes.providerReference) {
                  kyandaRef = vendRes.providerReference;
                }
              } else {
                const reason = queryRes.ResultDesc || 'M-Pesa payment prompt expired or declined';
                console.log(`[On-Demand Reconciliation] STK status not paid for ${reference}: ResultCode ${queryRes.ResultCode} (${reason})`);
                await orchestrator.updatePaymentState(tx.id, 'PAYMENT_FAILED', undefined, reason);
                currentStatus = 'PAYMENT_FAILED';
                tx.failure_reason = reason;
              }
            } catch (err: any) {
              console.warn(`[On-Demand Reconciliation] Daraja query error for ${reference}:`, err.message);
              if (ageMs > 5 * 60 * 1000) {
                const orchestrator = new TransactionOrchestrator(supabase);
                await orchestrator.updatePaymentState(
                  tx.id,
                  'PAYMENT_FAILED',
                  undefined,
                  'M-Pesa payment prompt expired (5m timeout)'
                );
                currentStatus = 'PAYMENT_FAILED';
                tx.failure_reason = 'M-Pesa payment prompt expired (5m timeout)';
              }
            }
          }
        }
      }
    }

    // On-demand reconciliation for VENDING_PENDING
    if (tx.status === 'VENDING_PENDING' || currentStatus === 'VENDING_PENDING') {
      const activeKyandaRef = tx.kyanda_reference || kyandaRef;

      // If pending without a provider reference, dispatch vending immediately
      if (!activeKyandaRef) {
        console.log(`[On-Demand Reconciliation] VENDING_PENDING has no provider reference for ${reference}. Executing vending now.`);
        try {
          const vendRes = await executeVendingForTransaction(tx.id, supabase);
          currentStatus = vendRes.status;
          if (vendRes.providerReference) {
            kyandaRef = vendRes.providerReference;
          }
        } catch (err: any) {
          console.error(`[On-Demand Reconciliation] Vending dispatch error for ${reference}:`, err.message);
        }
      } else {
        const updatedAt = new Date(tx.updated_at).getTime();
        const now = Date.now();
        
        // If pending for more than 2 seconds, fetch live status from Kyanda
        if (now - updatedAt > 2000) {
          console.log(`[On-Demand Reconciliation] Fetching Kyanda status for ${reference}`);
          try {
            const kyandaProvider = new KyandaProvider();
            const response = await kyandaProvider.checkTransactionStatus(activeKyandaRef);
            
            const kyandaStatus = response.status?.toLowerCase() || response.details?.Status?.toLowerCase() || '';
            
            let isFinal = false;
            let isSuccess = false;

            if (kyandaStatus === 'success' || kyandaStatus === '0000' || kyandaStatus === 'completed') {
              isFinal = true;
              isSuccess = true;
            } else if (kyandaStatus === 'failed' || kyandaStatus.includes('error')) {
              isFinal = true;
              isSuccess = false;
            }

            if (isFinal) {
              const orchestrator = new TransactionOrchestrator(supabase);
              const token = (response.details as any)?.Token || (response as any).Token || (response.details as any)?.token;
              const units = (response.details as any)?.Units || (response as any).Units || (response.details as any)?.units;
              if (token) metadata.token = token;
              if (units) metadata.units = units;

              await orchestrator.finalizeTransaction(
                tx.id, 
                isSuccess, 
                isSuccess ? undefined : `Reconciled manually: ${kyandaStatus}`,
                activeKyandaRef,
                metadata
              );
              currentStatus = isSuccess ? 'SUCCESS' : 'VENDING_FAILED';
            }
          } catch (err: any) {
            console.error(`[On-Demand Reconciliation] Error for ${reference}:`, err.message);
          }
        }
      }
    }

    return NextResponse.json({
      state: currentStatus,
      providerRef: kyandaRef,
      paymentRef: tx.payment_reference,
      reference: tx.qsn_reference,
      amount: tx.amount,
      destination: tx.destination,
      service: tx.services,
      metadata: metadata,
      createdAt: tx.created_at,
      message: tx.failure_reason,
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
