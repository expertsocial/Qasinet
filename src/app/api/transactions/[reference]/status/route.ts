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
      .select('id, status, kyanda_reference, updated_at')
      .eq('qsn_reference', reference)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    let currentStatus = tx.status;
    let kyandaRef = tx.kyanda_reference;

    // On-demand reconciliation for VENDING_PENDING
    if (tx.status === 'VENDING_PENDING' && tx.kyanda_reference) {
      const updatedAt = new Date(tx.updated_at).getTime();
      const now = Date.now();
      
      // If pending for more than 45 seconds without IPN, try manual fetch
      if (now - updatedAt > 45000) {
        console.log(`[On-Demand Reconciliation] Fetching Kyanda status for ${reference}`);
        try {
          const kyandaProvider = new KyandaProvider();
          const response = await kyandaProvider.checkTransactionStatus(tx.kyanda_reference);
          
          const kyandaStatus = response.status?.toLowerCase() || response.details?.Status?.toLowerCase() || '';
          
          let isFinal = false;
          let isSuccess = false;

          if (kyandaStatus === 'success' || kyandaStatus === '0000') {
            isFinal = true;
            isSuccess = true;
          } else if (kyandaStatus === 'failed' || kyandaStatus.includes('error')) {
            isFinal = true;
            isSuccess = false;
          }

          if (isFinal) {
            const orchestrator = new TransactionOrchestrator(supabase);
            await orchestrator.finalizeTransaction(tx.id, isSuccess, isSuccess ? undefined : `Reconciled manually: ${kyandaStatus}`);
            currentStatus = isSuccess ? 'SUCCESS' : 'VENDING_FAILED';
          }
        } catch (err: any) {
          console.error(`[On-Demand Reconciliation] Error for ${reference}:`, err.message);
          // Do not fail the transaction; allow it to be retried later or handled by IPN
        }
      }
    }

    return NextResponse.json({
      state: currentStatus,
      providerRef: kyandaRef,
      // If we have a successful transaction, we could fetch and attach the token/receipt data here
      // For now, we rely on the DB state. The frontend handles token extraction if needed.
    }, { status: 200 });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
