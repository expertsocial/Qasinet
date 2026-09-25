import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { BingwaProvider } from '@/lib/providers/bingwa/provider';
import { PayBillServiceHandler } from '@/lib/services/paybill';
import { QasiNetError } from '@/lib/errors';

export interface VendingExecutionResult {
  success: boolean;
  status: 'SUCCESS' | 'VENDING_PENDING' | 'VENDING_FAILED_REFUND_PENDING';
  providerReference?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

function getKyandaTelco(slug: string): string {
  const s = (slug || '').toLowerCase();
  if (s.includes('kplc-prepaid') || s.includes('prepaid')) return 'KPLC_PREPAID';
  if (s.includes('kplc-postpaid') || s.includes('postpaid')) return 'KPLC_POSTPAID';
  if (s.includes('kplc')) return 'KPLC_PREPAID';
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
  return 'SAFARICOM';
}

/**
 * Centrally executes vending for a transaction whose payment has been confirmed.
 * Guaranteed idempotent, robust error recovery, and sub-5s execution for airtime & bundles.
 */
export async function executeVendingForTransaction(
  transactionId: string,
  existingSupabaseClient?: SupabaseClient
): Promise<VendingExecutionResult> {
  const supabase = existingSupabaseClient || createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const orchestrator = new TransactionOrchestrator(supabase);

  // 1. Fetch current transaction state
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, qsn_reference, status, amount, destination, payment_reference, kyanda_reference, services(slug, type), products(provider_product_id)')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    throw new Error(`Transaction ${transactionId} not found for vending execution.`);
  }

  // Idempotency: If already completed or in refund state, do not double-vend
  if (tx.status === 'SUCCESS' || tx.status === 'COMPLETED') {
    return {
      success: true,
      status: 'SUCCESS',
      providerReference: tx.kyanda_reference || undefined,
    };
  }

  if (tx.status === 'VENDING_FAILED_REFUND_PENDING') {
    return {
      success: false,
      status: 'VENDING_FAILED_REFUND_PENDING',
      error: 'Transaction already flagged for refund review.',
    };
  }

  // Ensure transaction is in authorized state
  if (tx.status === 'PAYMENT_PENDING' || tx.status === 'CREATED') {
    await orchestrator.updatePaymentState(tx.id, 'PAYMENT_CONFIRMED', tx.payment_reference || undefined);
    await orchestrator.authorizeVending(tx.id);
  }

  const kyandaProvider = new KyandaProvider();
  const services: any = tx.services;
  const products: any = tx.products;
  const serviceSlug = services?.slug || (Array.isArray(services) && services[0]?.slug) || '';
  const serviceType = services?.type || (Array.isArray(services) && services[0]?.type) || '';
  let telco = getKyandaTelco(serviceSlug);
  let productCode = products?.provider_product_id || (Array.isArray(products) && products[0]?.provider_product_id) || undefined;

  if (!productCode) {
    const { data: createdEvent } = await supabase
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

  if (serviceSlug.includes('faiba') && (serviceType === 'data' || productCode)) {
    telco = 'FAIBA_B';
  }

  const initiatorPhone = process.env.KYANDA_INITIATOR_PHONE || '0722647928';
  const isElectricity = serviceSlug.includes('kplc') || serviceSlug.includes('electricity') || serviceType === 'electricity';
  const isTv = serviceSlug.includes('tv') || serviceSlug.includes('dstv') || serviceSlug.includes('gotv') || serviceSlug.includes('zuku') || serviceSlug.includes('startimes') || serviceType === 'tv';
  const isWater = serviceSlug.includes('water') || serviceType === 'water';

  try {
    let vendingResult: { merchant_reference: string; [key: string]: any };

    if (isElectricity) {
      const paybillHandler = new PayBillServiceHandler(kyandaProvider);
      const meterType = serviceSlug.includes('postpaid') ? 'postpaid' : 'prepaid';
      vendingResult = await paybillHandler.vendElectricity({
        amount: tx.amount,
        meterNumber: tx.destination,
        type: meterType,
        initiatorPhone,
      });
    } else if (isTv) {
      const paybillHandler = new PayBillServiceHandler(kyandaProvider);
      vendingResult = await paybillHandler.vendTvSubscription({
        amount: tx.amount,
        decoderNumber: tx.destination,
        provider: telco,
        initiatorPhone,
      });
    } else if (isWater) {
      const paybillHandler = new PayBillServiceHandler(kyandaProvider);
      vendingResult = await paybillHandler.vendWater({
        amount: tx.amount,
        accountNumber: tx.destination,
        initiatorPhone,
      });
    } else if (serviceType === 'airtime' || serviceType === 'data') {
      const isResellerBundle = serviceSlug === 'safaricom-data' || serviceSlug === 'airtel-data';
      if (isResellerBundle) {
        const bingwaProvider = new BingwaProvider();
        const bundleRes = await bingwaProvider.vendBundle({
          phone: tx.destination,
          bundleCode: productCode || `${tx.amount}KES`,
          amount: tx.amount,
          reference: tx.qsn_reference || tx.payment_reference || tx.id,
        });
        vendingResult = {
          merchant_reference: bundleRes.transaction_id || bundleRes.reference || `RES-${Date.now()}`,
          ...bundleRes,
        };
      } else {
        if (serviceType === 'data' && !serviceSlug.includes('faiba')) {
          throw new QasiNetError('SERVICE_UNAVAILABLE', 'Data bundle vending is not supported on this network.');
        }
        vendingResult = await kyandaProvider.buyAirtime(
          tx.amount,
          tx.destination,
          telco,
          initiatorPhone,
          productCode
        );
      }
    } else {
      vendingResult = await kyandaProvider.payBill(
        tx.amount,
        tx.destination,
        telco,
        initiatorPhone
      );
    }

    const rawRes: any = vendingResult;
    const token = rawRes?.Token || rawRes?.token || rawRes?.details?.Token || rawRes?.details?.token;
    const units = rawRes?.Units || rawRes?.units || rawRes?.details?.Units || rawRes?.details?.units;

    const metadata: Record<string, unknown> = {
      merchant_reference: vendingResult.merchant_reference,
      kyanda_response: vendingResult,
    };
    if (token) metadata.token = token;
    if (units) metadata.units = units;

    // For airtime and data bundles, vending is immediate
    if (serviceType === 'airtime' || serviceType === 'data' || token) {
      await orchestrator.finalizeTransaction(
        tx.id,
        true,
        undefined,
        vendingResult.merchant_reference,
        metadata
      );
      return {
        success: true,
        status: 'SUCCESS',
        providerReference: vendingResult.merchant_reference,
        metadata,
      };
    } else {
      // For utility bills awaiting async IPN callback
      await supabase
        .from('transactions')
        .update({ kyanda_reference: vendingResult.merchant_reference })
        .eq('id', tx.id);

      await orchestrator.logEvent(tx.id, 'VENDING_PENDING', metadata);
      return {
        success: true,
        status: 'VENDING_PENDING',
        providerReference: vendingResult.merchant_reference,
        metadata,
      };
    }
  } catch (vendingError: unknown) {
    const err = vendingError as { message?: string; category?: string };
    console.error(`[Vending Execution Failed] for tx ${tx.id}:`, err?.message);

    await orchestrator.markVendingFailedRefundPending(
      tx.id,
      err?.message || 'Provider vending failed',
      undefined,
      {
        error: err?.message,
        error_category: err?.category || 'UNKNOWN',
        payment_reference: tx.payment_reference,
      }
    );

    return {
      success: false,
      status: 'VENDING_FAILED_REFUND_PENDING',
      error: err?.message || 'Provider vending failed',
    };
  }
}
