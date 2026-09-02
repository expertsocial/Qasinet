import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { createClient } from '@/lib/supabase/server';
import { Activity, Wallet, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default async function KyandaOperations() {
  const supabase = await createClient();

  let kyandaRes: any = null;
  let status = 'Unknown';
  let errorMsg = '';

  try {
    const provider = new KyandaProvider();
    kyandaRes = await provider.checkAccountBalance();
    status = 'Connected';
  } catch (error: any) {
    status = 'Disconnected';
    errorMsg = error.message || 'Failed to connect to Kyanda API';
  }

  // Get recent Kyanda transactions from DB
  const { data: recentKyandaTxs } = await supabase
    .from('kyanda_transactions')
    .select('*, transactions(qsn_reference)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Kyanda Provider Status
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Monitor upstream provider connectivity and balances.</p>
        </div>
        <form action="/admin/kyanda">
          <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <RefreshCw size={18} />
            Refresh
          </button>
        </form>
      </div>

      {status === 'Connected' ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex items-start gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-500">API Connected Successfully</h3>
            <p className="text-neutral-400 mt-1 text-sm">Authentication verified and communication with Kyanda is stable.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">API Connection Failed</h3>
            <p className="text-neutral-400 mt-1 text-sm">{errorMsg}</p>
          </div>
        </div>
      )}

      {kyandaRes && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="text-blue-500" />
              <h3 className="text-lg font-semibold text-white">Main Account Balance (Float)</h3>
            </div>
            <p className="text-4xl font-bold text-white tracking-tight">KES {kyandaRes.Account_Bal?.toLocaleString() || 0}</p>
            <p className="text-sm text-neutral-500 mt-2">Available for vending transactions</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-blue-500" />
              <h3 className="text-lg font-semibold text-white">Commission Earnings</h3>
            </div>
            <p className="text-4xl font-bold text-white tracking-tight">KES {kyandaRes.Earnings_Bal?.toLocaleString() || 0}</p>
            <p className="text-sm text-neutral-500 mt-2">Earned through transaction margins</p>
          </div>
        </div>
      )}

      {/* Recent Provider Activity */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">Recent Provider Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/50 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Internal Ref</th>
                <th className="px-6 py-4 font-medium">Provider Ref</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status Code</th>
                <th className="px-6 py-4 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {recentKyandaTxs?.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-emerald-500">
                    {/* @ts-ignore */}
                    <Link href={`/admin/transactions/${tx.transaction_id}`}>{tx.transactions?.qsn_reference}</Link>
                  </td>
                  <td className="px-6 py-4 font-mono">{tx.merchant_reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {tx.status_code === '0000' 
                      ? <span className="text-emerald-400 font-medium">0000</span>
                      : <span className="text-amber-400 font-medium">{tx.status_code}</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {tx.status_description}
                  </td>
                </tr>
              ))}
              {!recentKyandaTxs?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No recent provider interactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
