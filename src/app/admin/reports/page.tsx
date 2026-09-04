import { createClient } from '@/lib/supabase/server';
import { BarChart3 } from 'lucide-react';
import ReportsClient from './ReportsClient';

export default async function AdminReportsPage() {
  const supabase = await createClient();

  // Fetch transactions for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      qsn_reference,
      amount,
      profit,
      destination,
      status,
      created_at,
      payment_reference,
      kyanda_reference,
      services (
        name,
        type
      )
    `)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-emerald-400" />
            Financial & Volume Reports
          </h1>
          <p className="text-neutral-400 mt-1 text-sm">Analyze gross revenues, profit margins, and export transaction ledgers to CSV.</p>
        </div>
      </div>

      <ReportsClient initialData={transactions || []} />
    </div>
  );
}
