import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Basic admin check (could be more robust based on user roles)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // You might want to add a check here to ensure the user has 'ADMIN' role
    // For now we assume if they can hit this authenticated route, they have access
    // But let's check profile role if we can
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Get the transaction
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only allow reconciliation for transactions that have a provider reference
    // and aren't already finalized
    if (!tx.kyanda_reference) {
      return NextResponse.json({ error: 'Cannot reconcile: No provider reference' }, { status: 400 });
    }

    if (tx.status === 'SUCCESS' || tx.status === 'VENDING_FAILED' || tx.status === 'REVERSED') {
      return NextResponse.json({ error: `Cannot reconcile: Transaction already in terminal state ${tx.status}` }, { status: 400 });
    }

    // Initiate Kyanda status check
    const kyandaProvider = new KyandaProvider();
    
    let isSuccess = false;
    let message = 'Status unknown';
    let rawResponse = null;
    
    try {
        const response = await kyandaProvider.checkTransactionStatus(tx.kyanda_reference);
        rawResponse = response;
        const kyandaStatus = response.status?.toLowerCase() || response.details?.Status?.toLowerCase() || '';

        if (kyandaStatus === 'success' || kyandaStatus === '0000') {
            isSuccess = true;
            message = 'Reconciled successfully';
        } else if (kyandaStatus === 'failed' || kyandaStatus.includes('error')) {
            isSuccess = false;
            message = `Provider failed: ${kyandaStatus}`;
        } else {
            return NextResponse.json({ 
                error: `Provider status is still pending: ${kyandaStatus}`,
                providerResponse: response
            }, { status: 400 });
        }
    } catch (providerError: any) {
        return NextResponse.json({ 
            error: `Failed to query provider: ${providerError.message}` 
        }, { status: 500 });
    }

    // Use service role for finalizeTransaction
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);
    
    const orchestrator = new TransactionOrchestrator(supabaseService);
    
    await orchestrator.finalizeTransaction(
        tx.id, 
        isSuccess, 
        isSuccess ? undefined : `Admin manual reconciliation: ${message}`
    );

    return NextResponse.json({
        success: true,
        message: `Transaction forcefully reconciled to ${isSuccess ? 'SUCCESS' : 'FAILED'}`,
        rawResponse
    }, { status: 200 });

  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
