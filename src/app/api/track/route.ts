import { NextRequest, NextResponse } from 'next/server';
import { trackTransactionSchema } from '@/lib/validations/transaction';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';

function normalizePhone(p: string | null | undefined): string {
  if (!p) return '';
  const digits = p.replace(/[^0-9]/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) return digits.slice(1);
  return digits;
}

async function processTrackRequest(reference: string, rawPhone: string) {
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: transaction, error } = await serviceClient
    .from('transactions')
    .select(`
      id,
      qsn_reference,
      destination,
      guest_phone,
      user_id,
      amount,
      selling_price,
      status,
      failure_reason,
      payment_reference,
      kyanda_reference,
      created_at,
      updated_at,
      services ( name, slug, type ),
      service_providers ( name ),
      products ( name )
    `)
    .eq('qsn_reference', reference.trim())
    .single();

  if (error || !transaction) {
    return { error: 'Transaction not found or unauthorized', status: 404 };
  }

  // Strict ownership check with normalized numbers
  const inputNorm = normalizePhone(rawPhone);
  const guestNorm = normalizePhone(transaction.guest_phone);
  const destNorm = normalizePhone(transaction.destination);

  const isGuestOwner = Boolean(guestNorm && guestNorm === inputNorm);
  const isDestOwner = Boolean(destNorm && destNorm === inputNorm);

  if (!isGuestOwner && !isDestOwner) {
    return { error: 'Transaction not found or unauthorized', status: 404 };
  }

  // Fetch events timeline
  const { data: events } = await serviceClient
    .from('transaction_events')
    .select('id, status, details, created_at')
    .eq('transaction_id', transaction.id)
    .order('created_at', { ascending: true });

  const latestEvent = events && events.length > 0 ? events[events.length - 1] : null;
  let metadata: any = latestEvent?.details || {};
  let currentStatus = transaction.status;

  // On-demand reconciliation if pending vending
  if (transaction.status === 'VENDING_PENDING' && transaction.kyanda_reference) {
    const updatedAt = new Date(transaction.updated_at).getTime();
    const now = Date.now();

    if (now - updatedAt > 2000) {
      try {
        const kyandaProvider = new KyandaProvider();
        const response = await kyandaProvider.checkTransactionStatus(transaction.kyanda_reference);
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
          const orchestrator = new TransactionOrchestrator(serviceClient);
          const token = (response.details as any)?.Token || (response as any).Token;
          const units = (response.details as any)?.Units || (response as any).Units;
          if (token) metadata.token = token;
          if (units) metadata.units = units;

          await orchestrator.finalizeTransaction(
            transaction.id,
            isSuccess,
            isSuccess ? undefined : `Reconciled manually: ${kyandaStatus}`,
            transaction.kyanda_reference,
            metadata
          );
          currentStatus = isSuccess ? 'SUCCESS' : 'VENDING_FAILED';
        }
      } catch (err: any) {
        console.error('[Track Route Reconciliation Error]:', err.message);
      }
    }
  }

  return {
    transaction: {
      ...transaction,
      status: currentStatus,
    },
    events: events || [],
    metadata,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = trackTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { reference, phone } = parsed.data;
    const result = await processTrackRequest(reference, phone);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Track API POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get('reference') || url.searchParams.get('ref') || '';
    const phone = url.searchParams.get('phone') || '';

    const parsed = trackTransactionSchema.safeParse({ reference, phone });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.format() }, { status: 400 });
    }

    const result = await processTrackRequest(reference, phone);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Track API GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
