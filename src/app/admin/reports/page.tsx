import { createClient } from '@/lib/supabase/server';
import { BarChart3, Download } from 'lucide-react';
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
      amount,
      fee,
      status,
      created_at,
      service_id,
      services (
        name,
        type
      )
    `)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" />
            Financial Reports
          </h1>
          <p className="text-neutral-400 mt-1">Analyze sales, revenue, and transaction volume.</p>
        </div>
      </div>

      <ReportsClient initialData={transactions || []} />
    </div>
  );
}
