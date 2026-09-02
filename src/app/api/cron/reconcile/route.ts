import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { ReconciliationService } from '@/lib/services/reconciliation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Security check: Only allow authorized callers (e.g. Vercel Cron or internal admin token)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const orchestrator = new TransactionOrchestrator(supabase);
    const kyandaProvider = new KyandaProvider();
    const reconciliationService = new ReconciliationService(supabase, orchestrator, kyandaProvider);

    await reconciliationService.reconcilePendingTransactions();

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Reconciliation cron error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
