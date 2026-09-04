import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';

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
    let metadata: any = latestEvent?.details || {};

    // On-demand reconciliation for VENDING_PENDING
    if (tx.status === 'VENDING_PENDING' && tx.kyanda_reference) {
      const updatedAt = new Date(tx.updated_at).getTime();
      const now = Date.now();
      
      // If pending for more than 2 seconds, fetch live status from Kyanda
      if (now - updatedAt > 2000) {
        console.log(`[On-Demand Reconciliation] Fetching Kyanda status for ${reference}`);
        try {
          const kyandaProvider = new KyandaProvider();
          const response = await kyandaProvider.checkTransactionStatus(tx.kyanda_reference);
          
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
              tx.kyanda_reference,
              metadata
            );
            currentStatus = isSuccess ? 'SUCCESS' : 'VENDING_FAILED';
          }
        } catch (err: any) {
          console.error(`[On-Demand Reconciliation] Error for ${reference}:`, err.message);
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
    }, { status: 200 });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
