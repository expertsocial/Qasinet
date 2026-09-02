import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackTransactionSchema } from '@/lib/validations/transaction';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Zod Validation
    const parsed = trackTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }
    const { reference, phone } = parsed.data;

    // We must bypass standard RLS for this specific guest check because 
    // guests don't have an auth session, but we want to allow them to fetch their transaction
    // IF AND ONLY IF they know both the exact reference and the phone number used.
    // We use the Service Role Key for this specific query, but carefully validate the inputs.
    
    // DANGER: Never expose the service role key to the client.
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
        created_at,
        services ( name, type ),
        service_providers ( name ),
        products ( name )
      `)
      .eq('qsn_reference', reference)
      .single();

    if (error || !transaction) {
      // Return 404 even if it exists but phone doesn't match to prevent enumeration
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    // 2. Strict ownership check
    // If it's a guest transaction, the `guest_phone` must match the provided phone.
    // If it's a user transaction, we could check the user's phone, but typically if it belongs to a user,
    // they should be logged in. For now, we allow fallback tracking if the destination phone matches.
    const isGuestOwner = transaction.guest_phone === phone;
    const isDestinationOwner = transaction.destination === phone;
    
    if (!isGuestOwner && !isDestinationOwner) {
       return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    // Notice we do NOT select provider_cost or profit here. 
    // The query explicitly avoids those columns.
    
    return NextResponse.json({ transaction });

  } catch (error) {
    console.error('Internal API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
