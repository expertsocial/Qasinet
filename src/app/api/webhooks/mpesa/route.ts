import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { executeVendingForTransaction } from '@/lib/services/vending';

interface CallbackMetadataItem {
  Name: string;
  Value?: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Validate STK push payload structure
    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // We must use the Service Role to bypass RLS in the webhook
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const orchestrator = new TransactionOrchestrator(supabaseService);

    // 1. Find the transaction by CheckoutRequestID (stored in payment_reference)
    const { data: tx, error: fetchError } = await supabaseService
      .from('transactions')
      .select('id, qsn_reference, status, amount, destination, service_id, product_id')
      .eq('payment_reference', CheckoutRequestID)
      .single();

    if (fetchError || !tx) {
      console.error('[M-PESA Webhook] Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      console.error('[M-PESA Webhook] Full payload was:', JSON.stringify(stkCallback));
      // Even if not found, we return 200 so Daraja stops retrying
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Ignore if not in PAYMENT_PENDING state to prevent double-processing
    if (tx.status !== 'PAYMENT_PENDING' && tx.status !== 'CREATED') {
      console.log(`[M-PESA Webhook] Transaction ${tx.id} already processed. State: ${tx.status}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 2. Check if Payment was Successful on Daraja
    if (ResultCode !== 0) {
      console.warn(`[M-PESA Webhook] Payment failed on Daraja for tx ${tx.id}. Reason: ${ResultDesc}`);
      await orchestrator.updatePaymentState(tx.id, 'PAYMENT_FAILED', undefined, ResultDesc || 'M-Pesa payment cancelled/failed');
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 3. Handle Successful Payment
    // Extract Receipt Number from CallbackMetadata
    let mpesaReceipt = 'UNKNOWN';
    if (CallbackMetadata && CallbackMetadata.Item) {
      const receiptItem = CallbackMetadata.Item.find((item: CallbackMetadataItem) => item.Name === 'MpesaReceiptNumber');
      if (receiptItem && receiptItem.Value) {
        mpesaReceipt = receiptItem.Value;
      }
    }

    console.log(`[M-PESA Webhook] Payment successful for ${tx.id}, Receipt: ${mpesaReceipt}`);
    await orchestrator.updatePaymentState(tx.id, 'PAYMENT_CONFIRMED', mpesaReceipt);
    
    // Log the actual payment in the payments table
    await supabaseService.from('payments').insert({
      transaction_id: tx.id,
      method: 'MPESA',
      amount: tx.amount,
      reference: mpesaReceipt,
      status: 'COMPLETED'
    });

    // 4. Authorize Vending
    await orchestrator.authorizeVending(tx.id);

    // 5. Execute Vending (<5s immediate fulfillment)
    try {
      console.log(`[M-PESA Webhook] Starting immediate vending execution for ${tx.id}`);
      const vendRes = await executeVendingForTransaction(tx.id, supabaseService);
      console.log(`[M-PESA Webhook] Vending execution completed for ${tx.id}, status: ${vendRes.status}`);
    } catch (vendingError: unknown) {
      const err = vendingError as { message?: string; category?: string };
      console.error(`[M-PESA Webhook] Vending execution failed for ${tx.id}:`, err?.message);
    }

    // Acknowledge Daraja immediately
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[M-PESA Webhook] Internal error:', err?.message);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}
