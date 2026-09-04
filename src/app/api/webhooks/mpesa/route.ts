import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';

// Map service slugs to Kyanda Telco IDs
function getKyandaTelco(slug: string): string {
  const s = (slug || '').toLowerCase();
  if (s.includes('kplc-prepaid') || s.includes('prepaid')) return 'KPLC_PREPAID';
  if (s.includes('kplc-postpaid') || s.includes('postpaid')) return 'KPLC_POSTPAID';
  if (s.includes('kplc')) return 'KPLC_PREPAID';
  if (s.includes('dstv')) return 'DSTV';
  if (s.includes('gotv')) return 'GOTV';
  if (s.includes('zuku')) return 'ZUKU';
  if (s.includes('startimes')) return 'STARTIMES';
  if (s.includes('water') || s.includes('nairobi-water') || s.includes('nairobiwater')) return 'NAIROBIWATER';
  if (s.includes('safaricom')) return 'SAFARICOM';
  if (s.includes('airtel')) return 'AIRTEL';
  if (s.includes('telkom')) return 'TELKOM';
  if (s.includes('equitel')) return 'EQUITEL';
  if (s.includes('faiba')) return 'FAIBA';
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
      console.error('[M-PESA Webhook] Full payload was:', JSON.stringify(stkCallback));
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
      await orchestrator.updatePaymentState(tx.id, 'PAYMENT_FAILED', CheckoutRequestID, ResultDesc);
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

    // 5. EVENT-DRIVEN VENDING (Background execution)
    // Execute vending without awaiting, so M-PESA gets an instant 200 OK.
    const runVending = async () => {
      try {
        console.log(`[M-PESA Webhook] Starting background Kyanda vending for ${tx.id}`);
        const kyandaProvider = new KyandaProvider();
        const services: any = tx.services;
        const serviceSlug = services?.slug || (Array.isArray(services) && services[0]?.slug) || '';
        const serviceType = services?.type || (Array.isArray(services) && services[0]?.type) || '';
        const telco = getKyandaTelco(serviceSlug);
        
        // Use a valid phone number format as Kyanda rejects generic strings
        const initiatorPhone = process.env.KYANDA_INITIATOR_PHONE || '0722647928';

        let vendingResult: { merchant_reference: string };

        console.log(`[Kyanda Vending Payload] Type: ${serviceType}, Amount: ${tx.amount}, Dest: ${tx.destination}, Telco: ${telco}, Initiator: ${initiatorPhone}`);

        if (serviceType === 'airtime') {
          vendingResult = await kyandaProvider.buyAirtime(
            tx.amount,
            tx.destination,
            telco,
            initiatorPhone
          );
        } else {
          vendingResult = await kyandaProvider.payBill(
            tx.amount,
            tx.destination,
            telco,
            initiatorPhone
          );
        }

        console.log(`[M-PESA Webhook] Vending initiated for ${tx.id}, Kyanda Ref: ${vendingResult.merchant_reference}`);
        
        const rawRes: any = vendingResult;
        const token = rawRes?.Token || rawRes?.token || rawRes?.details?.Token || rawRes?.details?.token;
        const units = rawRes?.Units || rawRes?.units || rawRes?.details?.Units || rawRes?.details?.units;

        const metadata: any = {
          merchant_reference: vendingResult.merchant_reference,
          kyanda_response: vendingResult
        };
        if (token) metadata.token = token;
        if (units) metadata.units = units;

        // For airtime or if token/receipt is already returned, finalize immediately as SUCCESS
        if (serviceType === 'airtime' || token) {
          console.log(`[M-PESA Webhook] Finalizing transaction ${tx.id} to SUCCESS`);
          await orchestrator.finalizeTransaction(
            tx.id,
            true,
            undefined,
            vendingResult.merchant_reference,
            metadata
          );
        } else {
          // For utility bills awaiting asynchronous token delivery
          await supabaseService
            .from('transactions')
            .update({ 
              kyanda_reference: vendingResult.merchant_reference,
              metadata: metadata
            })
            .eq('id', tx.id);
        }

      } catch (vendingError: any) {
        console.error(`[M-PESA Webhook] Background vending failed for ${tx.id}:`, vendingError.message);
        await supabaseService
          .from('transactions')
          .update({ 
            status: 'VENDING_FAILED', 
            failure_reason: vendingError.message || 'Kyanda API failed' 
          })
          .eq('id', tx.id);
      }
    };

    // Use Next.js 'after' if available, otherwise fallback to floating promise (safe in Node.js runtime)
    try {
      const { after } = require('next/server');
      if (typeof after === 'function') {
        after(runVending);
      } else {
        runVending().catch(console.error);
      }
    } catch (e) {
      runVending().catch(console.error);
    }

    // Acknowledge Daraja immediately
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error('[M-PESA Webhook] Internal error:', error.message);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}
