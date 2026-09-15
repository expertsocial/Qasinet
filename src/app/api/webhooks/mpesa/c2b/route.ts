import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { BingwaProvider } from '@/lib/providers/bingwa/provider';
import { SAFARICOM_DATA_BUNDLES } from '@/lib/constants/safaricom-bundles';
import { AIRTEL_DATA_BUNDLES } from '@/lib/constants/airtel-bundles';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { isValidKenyanPhone, normalizeKenyanPhone } from '@/lib/validation';

export interface SafaricomC2BPayload {
  TransactionType?: string;
  TransID: string;
  TransTime?: string;
  TransAmount: string | number;
  BusinessShortCode?: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

export interface ParsedC2BReference {
  bundleCode: string | null;
  recipient: string | null;
  serviceSlug: 'safaricom-data' | 'airtel-data' | null;
  isAmbiguous: boolean;
}

/**
 * Parses self-describing reference from BillRefNumber:
 * - "1.25GB*0712345678" -> code: "1.25GB", dest: "0712345678"
 * - "1.25GB" -> code: "1.25GB", dest: payer phone
 * - "0712345678" -> dest: "0712345678", code deduced from unique price if possible
 */
export function parseC2BReference(rawRef: string, payerPhone: string, amount: number): ParsedC2BReference {
  const cleanRef = (rawRef || '').trim().replace(/\s+/g, '');
  const cleanPayer = normalizeKenyanPhone(payerPhone);

  // Case 1: Structured format CODE*PHONE or CODE#PHONE or CODE-PHONE
  const matchWithSeparator = cleanRef.match(/^([0-9a-zA-Z._]+)[*#-](0[17][0-9]{8}|254[17][0-9]{8})$/i);
  if (matchWithSeparator) {
    const [, rawCode, rawPhone] = matchWithSeparator;
    const normPhone = normalizeKenyanPhone(rawPhone);
    const code = rawCode.toUpperCase();
    
    // Check Safaricom
    const safBundle = SAFARICOM_DATA_BUNDLES.find(b => b.code.toUpperCase() === code || b.name.toUpperCase().includes(code));
    if (safBundle) {
      return { bundleCode: safBundle.code, recipient: normPhone, serviceSlug: 'safaricom-data', isAmbiguous: false };
    }

    // Check Airtel
    const airBundle = AIRTEL_DATA_BUNDLES.find(b => b.code.toUpperCase() === code || b.name.toUpperCase().includes(code));
    if (airBundle) {
      return { bundleCode: airBundle.code, recipient: normPhone, serviceSlug: 'airtel-data', isAmbiguous: false };
    }
  }

  // Case 2: Just the bundle code (e.g. "1.25GB", "2GB", "14GB") -> recipient is payer phone
  const codeOnly = cleanRef.toUpperCase();
  const safBundle = SAFARICOM_DATA_BUNDLES.find(b => b.code.toUpperCase() === codeOnly || b.name.toUpperCase().includes(codeOnly));
  if (safBundle && isValidKenyanPhone(cleanPayer)) {
    return { bundleCode: safBundle.code, recipient: cleanPayer, serviceSlug: 'safaricom-data', isAmbiguous: false };
  }

  const airBundle = AIRTEL_DATA_BUNDLES.find(b => b.code.toUpperCase() === codeOnly || b.name.toUpperCase().includes(codeOnly));
  if (airBundle && isValidKenyanPhone(cleanPayer)) {
    return { bundleCode: airBundle.code, recipient: cleanPayer, serviceSlug: 'airtel-data', isAmbiguous: false };
  }

  // Case 3: Customer typed a phone number as reference -> deduce from unique amount if unambiguous
  if (isValidKenyanPhone(cleanRef)) {
    const matchingSaf = SAFARICOM_DATA_BUNDLES.filter(b => b.price === amount);
    const matchingAir = AIRTEL_DATA_BUNDLES.filter(b => b.price === amount);

    if (matchingSaf.length === 1 && matchingAir.length === 0) {
      return { bundleCode: matchingSaf[0].code, recipient: cleanRef, serviceSlug: 'safaricom-data', isAmbiguous: false };
    }
    if (matchingAir.length === 1 && matchingSaf.length === 0) {
      return { bundleCode: matchingAir[0].code, recipient: cleanRef, serviceSlug: 'airtel-data', isAmbiguous: false };
    }
  }

  return { bundleCode: null, recipient: null, serviceSlug: null, isAmbiguous: true };
}

export async function POST(req: NextRequest) {
  try {
    const body: SafaricomC2BPayload = await req.json();
    console.log(`[M-PESA C2B Webhook] Received Paybill payment: TransID=${body.TransID}, Amount=${body.TransAmount}, Ref=${body.BillRefNumber}, MSISDN=${body.MSISDN}`);

    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const numAmount = Math.round(Number(body.TransAmount) || 0);
    const mpesaReceipt = body.TransID;
    const parsedRef = parseC2BReference(body.BillRefNumber, body.MSISDN, numAmount);

    const orchestrator = new TransactionOrchestrator(supabaseService);

    // If ambiguous or unmatched, save under UNMATCHED_PAYMENT_MANUAL_REVIEW
    if (parsedRef.isAmbiguous || !parsedRef.bundleCode || !parsedRef.recipient || !parsedRef.serviceSlug) {
      console.warn(`[M-PESA C2B Webhook] Unmatched reference '${body.BillRefNumber}' for KES ${numAmount} from ${body.MSISDN}. Routing to UNMATCHED_PAYMENT_MANUAL_REVIEW.`);

      const { data: unmatchedTx, error: insertErr } = await supabaseService
        .from('transactions')
        .insert({
          qsn_reference: `QSN-C2B-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          destination: body.MSISDN,
          guest_phone: body.MSISDN,
          amount: numAmount,
          selling_price: numAmount,
          status: 'UNMATCHED_PAYMENT_MANUAL_REVIEW',
          mpesa_receipt: mpesaReceipt,
          metadata: {
            unmatched_reason: 'Ambiguous or unparseable account reference',
            raw_c2b: body
          }
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[M-PESA C2B Webhook] Failed to insert unmatched payment:', insertErr.message);
      } else if (unmatchedTx) {
        await orchestrator.logEvent(unmatchedTx.id, 'UNMATCHED_PAYMENT_MANUAL_REVIEW', {
          mpesaReceipt,
          billRefNumber: body.BillRefNumber,
          amount: numAmount,
          payer: body.MSISDN
        });
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment logged for manual review" });
    }

    // Verified match: look up service in DB
    const { data: service } = await supabaseService
      .from('services')
      .select('id, provider_id')
      .eq('slug', parsedRef.serviceSlug)
      .single();

    if (!service) {
      console.error(`[M-PESA C2B Webhook] Service ${parsedRef.serviceSlug} not found in DB`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Service not found" });
    }

    const qsnRef = `QSN-C2B-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create confirmed transaction
    const { data: newTx, error: txError } = await supabaseService
      .from('transactions')
      .insert({
        qsn_reference: qsnRef,
        service_id: service.id,
        provider_id: service.provider_id,
        destination: parsedRef.recipient,
        guest_phone: body.MSISDN,
        amount: numAmount,
        selling_price: numAmount,
        status: 'PAYMENT_CONFIRMED',
        mpesa_receipt: mpesaReceipt,
        metadata: {
          bundleCode: parsedRef.bundleCode,
          c2b_reference: body.BillRefNumber,
          raw_c2b: body
        }
      })
      .select()
      .single();

    if (txError || !newTx) {
      console.error('[M-PESA C2B Webhook] Failed to create transaction:', txError?.message);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Transaction insert failed" });
    }

    await orchestrator.logEvent(newTx.id, 'PAYMENT_CONFIRMED', {
      mpesaReceipt,
      source: 'C2B_DIRECT_PAYBILL',
      bundleCode: parsedRef.bundleCode
    });

    // Dispatch automatic vending via BingwaProvider
    try {
      console.log(`[M-PESA C2B Webhook] Auto-vending bundle ${parsedRef.bundleCode} for ${parsedRef.recipient}`);
      const bingwa = new BingwaProvider();
      const vendRes = await bingwa.vendBundle({
        phone: parsedRef.recipient,
        bundleCode: parsedRef.bundleCode,
        amount: numAmount,
        reference: qsnRef
      });

      await orchestrator.finalizeTransaction(
        newTx.id,
        true,
        undefined,
        vendRes.transaction_id || vendRes.reference || `RES-${Date.now()}`,
        { ...vendRes, c2bReceipt: mpesaReceipt }
      );
      console.log(`[M-PESA C2B Webhook] Vending SUCCESS for ${newTx.id}`);
    } catch (vendError: unknown) {
      const err = vendError as { message?: string };
      console.error(`[M-PESA C2B Webhook] Vending failed for ${newTx.id}:`, err?.message);
      await orchestrator.markVendingFailedRefundPending(
        newTx.id,
        err?.message || 'Upstream vending failed for C2B order',
        undefined,
        { error: err?.message, mpesaReceipt }
      );
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Confirmation received successfully" });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[M-PESA C2B Webhook] Error processing C2B callback:', e?.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Error processed" });
  }
}
