import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
  return 'SAFARICOM';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

    const isAdmin = 
      user.app_metadata?.role === 'ADMIN' ||
      user.app_metadata?.is_admin === true ||
      user.email === 'sanaregeorge08@gmail.com';

    if (!isAdmin) {
      const { data: adminCheck } = await supabaseService.from('admins').select('id').eq('id', user.id).single();
      if (!adminCheck) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const { data: tx, error } = await supabaseService
      .from('transactions')
      .select('id, status, amount, destination, payment_reference, services(slug, type), products(provider_product_id)')
      .eq('id', id)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const kyandaProvider = new KyandaProvider();
    const services: any = tx.services;
    const products: any = tx.products;
    const serviceSlug = services?.slug || (Array.isArray(services) && services[0]?.slug) || '';
    const serviceType = services?.type || (Array.isArray(services) && services[0]?.type) || '';
    let telco = getKyandaTelco(serviceSlug);
    const productCode = products?.provider_product_id || (Array.isArray(products) && products[0]?.provider_product_id) || undefined;

    // For Faiba Bundles, Kyanda expects telco 'FAIBA_B' with productCode
    if (serviceSlug.includes('faiba') && (serviceType === 'data' || productCode)) {
      telco = 'FAIBA_B';
    }

    const initiatorPhone = process.env.KYANDA_INITIATOR_PHONE || '0722647928';

    let vendingResult: { merchant_reference: string };

    if (serviceType === 'airtime' || serviceType === 'data') {
      vendingResult = await kyandaProvider.buyAirtime(
        tx.amount,
        tx.destination,
        telco,
        initiatorPhone,
        productCode
      );
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

    const metadata: any = {
      merchant_reference: vendingResult.merchant_reference,
      kyanda_response: vendingResult
    };
    if (token) metadata.token = token;
    if (units) metadata.units = units;

    const orchestrator = new TransactionOrchestrator(supabaseService);

    // Finalize directly to SUCCESS for airtime, data bundles, or if token is present
    if (serviceType === 'airtime' || serviceType === 'data' || token) {
      await orchestrator.finalizeTransaction(
        tx.id,
        true,
        undefined,
        vendingResult.merchant_reference,
        metadata
      );
    } else {
      await supabaseService
        .from('transactions')
        .update({
          status: 'VENDING_PENDING',
          kyanda_reference: vendingResult.merchant_reference,
          failure_reason: null
        })
        .eq('id', tx.id);
    }

    await supabaseService.from('transaction_events').insert({
      transaction_id: tx.id,
      status: serviceType === 'airtime' || token ? 'SUCCESS' : 'VENDING_PENDING',
      details: { message: 'Admin manual re-vend succeeded', kyanda_ref: vendingResult.merchant_reference, user: user.email }
    });

    return NextResponse.json({
      success: true,
      message: `Vending re-vended successfully with Kyanda ref: ${vendingResult.merchant_reference}`,
      merchant_reference: vendingResult.merchant_reference
    }, { status: 200 });

  } catch (error: any) {
    console.error('Revend error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to re-vend' }, { status: 500 });
  }
}
