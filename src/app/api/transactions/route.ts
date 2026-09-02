import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { initTransactionSchema } from '@/lib/validations/transaction';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { QasiNetError } from '@/lib/errors';

// Basic in-memory rate limiter (Warning: Resets on serverless cold starts)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests, please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    
    // 1. Zod Validation
    const parsed = initTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }
    const { serviceSlug, productId, destination, amount, guestPhone } = parsed.data;

    // A real client should pass an idempotency key (e.g. uuid) in headers or body.
    const idempotencyKey = req.headers.get('x-idempotency-key') || `${destination}-${amount}-${Date.now()}`;

    // Get user session to link transaction to user
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user && !guestPhone) {
      return NextResponse.json({ error: 'Guest phone is required for unauthenticated users' }, { status: 400 });
    }

    // 2. Delegate to Orchestrator using Service Role Client for secure DB writes bypassing RLS
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const orchestrator = new TransactionOrchestrator(supabaseService);
    
    const transaction = await orchestrator.initiateTransaction({
      serviceSlug,
      productId,
      destination,
      amount,
      guestPhone,
      userId: user?.id,
      idempotencyKey
    });

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        reference: transaction.qsn_reference,
        status: transaction.status,
        amount: transaction.amount,
        payable: transaction.selling_price
      }
    }, { status: 201 });

  } catch (error) {
    // Avoid logging sensitive data, just log the structure
    console.error('Internal API Error:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof QasiNetError) {
      const statusMap: Record<string, number> = {
        'VALIDATION_ERROR': 400,
        'DUPLICATE_REQUEST': 409,
        'SERVICE_UNAVAILABLE': 503,
      };
      return NextResponse.json(error.toClientResponse(), { status: statusMap[error.category] || 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
