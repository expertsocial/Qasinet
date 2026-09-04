import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

    // Verify Admin rights
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

    // Get the transaction
    const { data: tx, error } = await supabaseService
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    let isSuccess = false;
    let message = 'Reconciled';
    let rawResponse: any = null;
    
    // Fetch latest event details
    const { data: latestEv } = await supabaseService
      .from('transaction_events')
      .select('details')
      .eq('transaction_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const metadata: any = latestEv?.details || {};

    if (tx.kyanda_reference) {
      try {
        const kyandaProvider = new KyandaProvider();
        const response = await kyandaProvider.checkTransactionStatus(tx.kyanda_reference);
        rawResponse = response;
        const kyandaStatus = response.status?.toLowerCase() || response.details?.Status?.toLowerCase() || '';

        if (kyandaStatus === 'success' || kyandaStatus === '0000' || kyandaStatus === 'completed') {
          isSuccess = true;
          message = 'Provider confirmed success';
        } else if (kyandaStatus === 'failed' || kyandaStatus.includes('error')) {
          isSuccess = false;
          message = `Provider reported failure: ${kyandaStatus}`;
        } else {
          // If still pending or status code 1100, assume success if airtime was delivered
          isSuccess = true;
          message = `Provider status ${kyandaStatus} reconciled to SUCCESS`;
        }

        const token = (response.details as any)?.Token || (response as any).Token || (response.details as any)?.token;
        const units = (response.details as any)?.Units || (response as any).Units || (response.details as any)?.units;
        if (token) metadata.token = token;
        if (units) metadata.units = units;

      } catch (providerError: any) {
        // If provider query failed but payment was received, allow admin force-success
        isSuccess = true;
        message = `Reconciled manually by Admin: ${providerError.message}`;
      }
    } else {
      // If no kyanda_reference, admin can force-mark as SUCCESS if customer received service
      isSuccess = true;
      message = 'Force-reconciled to SUCCESS by Admin';
    }

    // Finalize state
    const orchestrator = new TransactionOrchestrator(supabaseService);
    await orchestrator.finalizeTransaction(
      tx.id,
      isSuccess,
      isSuccess ? undefined : `Admin reconciliation: ${message}`,
      tx.kyanda_reference || undefined,
      metadata
    );

    return NextResponse.json({
      success: true,
      message: `Transaction reconciled to ${isSuccess ? 'SUCCESS' : 'FAILED'} (${message})`,
      rawResponse
    }, { status: 200 });

  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
