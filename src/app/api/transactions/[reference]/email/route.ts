import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReceiptEmail } from '@/lib/services/email';

// Simple rate limiter to prevent spamming email dispatch
const emailRateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60000; // 1 minute
const MAX_PER_WINDOW = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = emailRateLimit.get(key);
  if (!record || record.resetAt < now) {
    emailRateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_PER_WINDOW) {
    return true;
  }
  record.count++;
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;
    if (!reference) {
      return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (isRateLimited(`${ip}:${reference}`)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute before requesting another email.' }, { status: 429 });
    }

    const body = await req.json();
    const email = body?.email?.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch transaction details
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('id, qsn_reference, status, amount, destination, payment_reference, kyanda_reference, created_at, services(name, slug, type)')
      .eq('qsn_reference', reference)
      .single();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch latest event details for tokens, units, etc.
    const { data: latestEvent } = await supabase
      .from('transaction_events')
      .select('details')
      .eq('transaction_id', tx.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const metadata: any = latestEvent?.details || {};
    const service: any = tx.services;
    const serviceName = service?.name || (Array.isArray(service) ? service[0]?.name : 'Digital Utility');
    const serviceType = service?.type || (Array.isArray(service) ? service[0]?.type : undefined);

    const emailResult = await sendReceiptEmail({
      to: email,
      reference: tx.qsn_reference,
      amount: tx.amount,
      serviceName,
      serviceType,
      destination: tx.destination,
      paymentReference: tx.payment_reference,
      providerReference: tx.kyanda_reference,
      date: tx.created_at,
      token: metadata?.token,
      units: metadata?.units,
      accountName: metadata?.accountName,
    });

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: emailResult.error || 'Failed to dispatch email' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Receipt successfully sent to ${email}`,
      id: emailResult.id,
    }, { status: 200 });

  } catch (err: any) {
    console.error('Email dispatch route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
