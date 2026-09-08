import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { PayBillServiceHandler } from '@/lib/services/paybill';
import { QasiNetError } from '@/lib/errors';

// Map service slugs to Kyanda Telco IDs for non-electricity services
function getKyandaTelco(slug: string): string {
  const s = (slug || '').toLowerCase();
  if (s.includes('dstv')) return 'DSTV';
  if (s.includes('gotv')) return 'GOTV';
  if (s.includes('zuku')) return 'ZUKU';
  if (s.includes('startimes')) return 'STARTIMES';
  if (s.includes('water') || s.includes('nairobi-water') || s.includes('nairobiwater') || s.includes('nairobi_wtr')) return 'NAIROBI_WTR';
  if (s.includes('safaricom')) return 'SAFARICOM';
  if (s.includes('airtel')) return 'AIRTEL';
  if (s.includes('telkom')) return 'TELKOM';
  if (s.includes('equitel')) return 'EQUITEL';
  if (s.includes('faiba-bundle') || s.includes('faiba_b') || s.includes('faiba-data')) return 'FAIBA_B';
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
      .select('id, status, amount, destination, service_id, product_id, services(slug, type), products(name, provider_product_id)')
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

    // 5. VENDING DISPATCH
    // We execute Kyanda vending and finalize transaction before acknowledging M-Pesa
    try {
      console.log(`[M-PESA Webhook] Starting Kyanda vending for ${tx.id}`);
      const kyandaProvider = new KyandaProvider();
      const services: any = tx.services;
      const products: any = tx.products;
      const serviceSlug = services?.slug || (Array.isArray(services) && services[0]?.slug) || '';
      const serviceType = services?.type || (Array.isArray(services) && services[0]?.type) || '';
      
      const initiatorPhone = process.env.KYANDA_INITIATOR_PHONE || '0722647928';
      const isElectricity = serviceSlug.includes('kplc') || serviceSlug.includes('electricity') || serviceType === 'electricity';
      const isTv = serviceSlug.includes('tv') || serviceSlug.includes('dstv') || serviceSlug.includes('gotv') || serviceSlug.includes('zuku') || serviceSlug.includes('startimes') || serviceType === 'tv';
      const isWater = serviceSlug.includes('water') || serviceType === 'water';

      let vendingResult: { merchant_reference: string; [key: string]: any };

      if (isElectricity) {
        console.log(`[M-PESA Webhook] Dispatching electricity vending for tx ${tx.id}`);
        const paybillHandler = new PayBillServiceHandler(kyandaProvider);
        const meterType = serviceSlug.includes('postpaid') ? 'postpaid' : 'prepaid';
        vendingResult = await paybillHandler.vendElectricity({
          amount: tx.amount,
          meterNumber: tx.destination,
          type: meterType,
          initiatorPhone
        });
      } else if (isTv) {
        const tvProvider = getKyandaTelco(serviceSlug);
        console.log(`[M-PESA Webhook] Dispatching TV subscription vending for tx ${tx.id}, Provider: ${tvProvider}`);
        const paybillHandler = new PayBillServiceHandler(kyandaProvider);
        vendingResult = await paybillHandler.vendTvSubscription({
          amount: tx.amount,
          decoderNumber: tx.destination,
          provider: tvProvider,
          initiatorPhone
        });
      } else if (isWater) {
        console.log(`[M-PESA Webhook] Dispatching water bill payment for tx ${tx.id}, Account: ${tx.destination}`);
        const paybillHandler = new PayBillServiceHandler(kyandaProvider);
        vendingResult = await paybillHandler.vendWater({
          amount: tx.amount,
          accountNumber: tx.destination,
          initiatorPhone
        });
      } else if (serviceType === 'airtime' || serviceType === 'data') {
        let telco = getKyandaTelco(serviceSlug);
        let productCode = products?.provider_product_id || (Array.isArray(products) && products[0]?.provider_product_id) || undefined;

        if (!productCode) {
          const { data: createdEvent } = await supabaseService
            .from('transaction_events')
            .select('details')
            .eq('transaction_id', tx.id)
            .eq('status', 'CREATED')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (createdEvent?.details?.productCode) {
            productCode = createdEvent.details.productCode;
          }
        }

        // Strictly block data bundle vending for non-Faiba networks
        if (serviceType === 'data' && !serviceSlug.includes('faiba')) {
          throw new QasiNetError('SERVICE_UNAVAILABLE', 'Data bundle vending is not supported on this network. Only Faiba 4G (FAIBA_B) is supported by Kyanda.');
        }

        // For Faiba Bundles, Kyanda expects telco 'FAIBA_B' with productCode
        if (serviceSlug.includes('faiba') && (serviceType === 'data' || productCode)) {
          telco = 'FAIBA_B';
        }

        console.log(`[Kyanda Vending Payload] Type: ${serviceType}, Amount: ${tx.amount}, Dest: ${tx.destination}, Telco: ${telco}, ProductCode: ${productCode}, Initiator: ${initiatorPhone}`);

        vendingResult = await kyandaProvider.buyAirtime(
          tx.amount,
          tx.destination,
          telco,
          initiatorPhone,
          productCode
        );
      } else {
        const telco = getKyandaTelco(serviceSlug);
        console.log(`[Kyanda Vending Payload] Bill Payment. Type: ${serviceType}, Amount: ${tx.amount}, Dest: ${tx.destination}, Telco: ${telco}, Initiator: ${initiatorPhone}`);
        vendingResult = await kyandaProvider.payBill(
          tx.amount,
          tx.destination,
          telco,
          initiatorPhone
        );
      }

      console.log(`[M-PESA Webhook] Vending response received for ${tx.id}, Kyanda Ref: ${vendingResult.merchant_reference}`);
      
      const rawRes: any = vendingResult;
      const token = rawRes?.token || rawRes?.Token || rawRes?.details?.Token || rawRes?.details?.token;
      const units = rawRes?.units || rawRes?.Units || rawRes?.details?.Units || rawRes?.details?.units;

      const metadata: any = {
        merchant_reference: vendingResult.merchant_reference,
        kyanda_response: vendingResult
      };
      if (token) metadata.token = token;
      if (units) metadata.units = units;

      // For airtime/data or if token is already returned, finalize immediately as SUCCESS
      if (serviceType === 'airtime' || serviceType === 'data' || token) {
        console.log(`[M-PESA Webhook] Finalizing transaction ${tx.id} to SUCCESS`);
        await orchestrator.finalizeTransaction(
          tx.id,
          true,
          undefined,
          vendingResult.merchant_reference,
          metadata
        );
      } else {
        // For utility bills awaiting asynchronous token delivery via IPN
        await supabaseService
          .from('transactions')
          .update({ 
            kyanda_reference: vendingResult.merchant_reference
          })
          .eq('id', tx.id);

        await orchestrator.logEvent(tx.id, 'VENDING_PENDING', metadata);
      }

    } catch (vendingError: any) {
      console.error(`[M-PESA Webhook] Vending failed for ${tx.id}:`, vendingError.message);
      // Customer has already paid via M-Pesa. Transition to VENDING_FAILED_REFUND_PENDING
      // so it is immediately flagged for review/reversal rather than silently stuck.
      await orchestrator.markVendingFailedRefundPending(
        tx.id,
        vendingError.message || 'Kyanda API failed',
        undefined,
        {
          error: vendingError.message,
          error_category: vendingError.category || 'UNKNOWN',
          mpesaReceipt
        }
      );
    }

    // Acknowledge Daraja immediately
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error('[M-PESA Webhook] Internal error:', error.message);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}
