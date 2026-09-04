import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { createClient } from '@/lib/supabase/server';
import { Activity, Wallet, ShieldCheck, AlertTriangle, RefreshCw, ExternalLink, Zap, Info } from 'lucide-react';
import Link from 'next/link';

export default async function KyandaOperationsPage() {
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

  // Get recent Kyanda transactions from transactions table
  const { data: recentKyandaTxs } = await supabase
    .from('transactions')
    .select('id, qsn_reference, kyanda_reference, amount, profit, status, created_at, destination, services(name)')
    .not('kyanda_reference', 'is', null)
    .order('created_at', { ascending: false })
    .limit(15);

  const floatBalance = kyandaRes?.Account_Bal || 0;
  const earningsBalance = kyandaRes?.Earnings_Bal || 0;
  const isFloatLow = floatBalance < 500 && status === 'Connected';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-emerald-400" />
            Kyanda Gateway Operations
          </h1>
          <p className="text-neutral-400 text-xs mt-1">Live float telemetry, automated vending status, and float management.</p>
        </div>
        
        <form action="/admin/kyanda">
          <button type="submit" className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Float
          </button>
        </form>
      </div>

      {/* Connection State Banner */}
      {status === 'Connected' ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-400">Kyanda API Connected & Healthy</h2>
            <p className="text-neutral-400 mt-0.5 text-xs">Production endpoints (`api.kyanda.app:443`) are responding and HMAC SHA256 signatures are authenticating properly.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-400">API Connection Offline</h2>
            <p className="text-neutral-400 mt-0.5 text-xs">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Float Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Main Float */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Main Vending Float</h2>
            </div>
            {isFloatLow && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Low Balance
              </span>
            )}
          </div>
          <p className="text-4xl font-black text-white tracking-tight">
            KES {floatBalance.toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Available balance for instant airtime, KPLC token, data, and bill vending.
          </p>
        </div>

        {/* Commission Earnings */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Commission Float</h2>
            </div>
          </div>
          <p className="text-4xl font-black text-emerald-400 tracking-tight">
            KES {earningsBalance.toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Earned margins from processed airtime and utility bills.
          </p>
        </div>

      </div>

      {/* Float Top-Up & Instructions */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-white font-bold text-sm">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>How to Top Up Your Kyanda Float</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300 pt-2">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <p className="text-neutral-400 font-semibold mb-1">1. M-Pesa Paybill</p>
            <p className="text-white font-mono font-bold text-sm">Paybill: 400200</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <p className="text-neutral-400 font-semibold mb-1">2. Account Number</p>
            <p className="text-emerald-400 font-mono font-bold text-sm">qasinet</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <p className="text-neutral-400 font-semibold mb-1">3. Instant Credit</p>
            <p className="text-white">Float is updated immediately after M-Pesa completes.</p>
          </div>
        </div>
      </div>

      {/* Recent Provider Activity Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-800/80 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Kyanda Dispatches</h2>
            <p className="text-xs text-neutral-400">Transactions forwarded to Kyanda upstream API.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-900/60 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Internal Ref</th>
                <th className="px-6 py-4">Kyanda Ref</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {recentKyandaTxs?.map((tx) => {
                const services: any = tx.services;
                const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Airtime';

                return (
                  <tr key={tx.id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      <Link href={`/admin/transactions/${tx.id}`} className="hover:underline">
                        {tx.qsn_reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-200">
                      {tx.kyanda_reference}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {serviceName}
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-400">
                      {tx.destination}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      KES {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : tx.status === 'VENDING_PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-neutral-500 font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {(!recentKyandaTxs || recentKyandaTxs.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No recent Kyanda dispatches logged.
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
