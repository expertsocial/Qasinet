import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';

// Map service slugs to Kyanda Telco IDs
function getKyandaTelco(slug: string): string {
  if (slug.includes('safaricom')) return 'SAFARICOM';
  if (slug.includes('airtel')) return 'AIRTEL';
  if (slug.includes('telkom')) return 'TELKOM';
  if (slug.includes('equitel')) return 'EQUITEL';
  if (slug.includes('faiba')) return 'FAIBA';
  if (slug.includes('kplc')) return 'KPLC';
  if (slug.includes('dstv')) return 'DSTV';
  if (slug.includes('gotv')) return 'GOTV';
  if (slug.includes('zuku')) return 'ZUKU';
  if (slug.includes('startimes')) return 'STARTIMES';
  if (slug.includes('nairobi-water') || slug.includes('nairobiwater')) return 'NAIROBIWATER';
  return 'SAFARICOM'; // Default fallback
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
      .select('id, status, amount, destination, service_id, services(slug, type)')
      .eq('payment_reference', CheckoutRequestID)
      .single();

    if (fetchError || !tx) {
      console.error('[M-PESA Webhook] Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      // Even if not found, we return 200 so Daraja stops retrying
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Ignore if not in PAYMENT_PENDING state to prevent double-processing
    if (tx.status !== 'PAYMENT_PENDING' && tx.status !== 'CREATED') {
      console.log(`[M-PESA Webhook] Transaction ${tx.id} already processed. State: ${tx.status}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 2. Handle Failed Payment
    if (ResultCode !== 0) {
      console.log(`[M-PESA Webhook] Payment failed for ${tx.id}: ${ResultDesc}`);
      await orchestrator.updatePaymentState(tx.id, 'PAYMENT_FAILED', CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 3. Handle Successful Payment
    // Extract Receipt Number from CallbackMetadata
    let mpesaReceipt = 'UNKNOWN';
    if (CallbackMetadata && CallbackMetadata.Item) {
      const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber');
      if (receiptItem) {
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

    // 5. EVENT-DRIVEN VENDING (Inline execution)
    // We execute Kyanda synchronously here so the UI gets instant feedback.
    try {
      const kyandaProvider = new KyandaProvider();
      const services: any = tx.services;
      const serviceSlug = services?.slug || (Array.isArray(services) && services[0]?.slug) || '';
      const serviceType = services?.type || (Array.isArray(services) && services[0]?.type) || '';
      const telco = getKyandaTelco(serviceSlug);
      
      // We use the admin/initiator phone number from env, or a fallback dummy for testing
      const initiatorPhone = process.env.KYANDA_INITIATOR_PHONE || '0700000000';

      let vendingResult: { merchant_reference: string };

      if (serviceType === 'airtime') {
        vendingResult = await kyandaProvider.buyAirtime(
          tx.amount,
          tx.destination,
          telco,
          initiatorPhone
        );
      } else {
        // Bills / TV / Electricity
        vendingResult = await kyandaProvider.payBill(
          tx.amount,
          tx.destination,
          telco,
          initiatorPhone
        );
      }

      console.log(`[M-PESA Webhook] Vending initiated for ${tx.id}, Kyanda Ref: ${vendingResult.merchant_reference}`);
      
      // Save the Kyanda reference. The reconciliation cron OR the Kyanda Webhook will finalize it later.
      // Wait, can we finalize instantly if Kyanda returns success?
      // Kyanda returns a merchant_reference. The actual status requires polling or Kyanda callback.
      // So we just update the transaction with the kyanda_reference.
      await supabaseService
        .from('transactions')
        .update({ kyanda_reference: vendingResult.merchant_reference })
        .eq('id', tx.id);

    } catch (vendingError: any) {
      console.error(`[M-PESA Webhook] Inline vending failed for ${tx.id}:`, vendingError.message);
      // Even if vending request failed, payment was successful.
      // A background cron can sweep VENDING_PENDING transactions without kyanda_reference and retry them.
    }

    // Acknowledge Daraja
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error('[M-PESA Webhook] Internal error:', error.message);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}
