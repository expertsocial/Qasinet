import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Filter, ArrowRight, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { RevendButton } from './RevendButton';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  const query = supabaseService
    .from('transactions')
    .select('*, services(name, slug, type), products(name, provider_product_id)', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Handle Search and Filters
  const search = typeof resolvedParams.q === 'string' ? resolvedParams.q.trim() : '';
  if (search) {
    query.or(`qsn_reference.ilike.%${search}%,kyanda_reference.ilike.%${search}%,destination.ilike.%${search}%,payment_reference.ilike.%${search}%`);
  }

  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  if (status) {
    if (status === 'FAILED') {
      query.in('status', ['VENDING_FAILED', 'PAYMENT_FAILED', 'TIMEOUT']);
    } else {
      query.eq('status', status);
    }
  }

  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const limit = 25;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query.range(from, to);

  const { data: transactions, count, error } = await query;

  if (error) {
    console.error('[Admin Transactions] Query error:', error);
  }

  // Fetch customer profiles in a batch for all transactions with user_id
  const userIds = Array.from(new Set(transactions?.map((t: any) => t.user_id).filter(Boolean)));
  let profilesMap: Record<string, { full_name: string; phone: string; email?: string }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabaseService
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', userIds);

    profiles?.forEach((p: any) => {
      profilesMap[p.id] = p;
    });
  }

  const failedCount = transactions?.filter(t => t.status === 'VENDING_FAILED' || t.status === 'TIMEOUT').length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Transactions</h2>
          <p className="text-neutral-400 text-sm mt-1">
            Monitor, audit, and re-vend utility payments and disbursements in real time.
          </p>
        </div>

        {failedCount > 0 && status !== 'FAILED' && status !== 'VENDING_FAILED' && (
          <Link
            href="/admin/transactions?status=FAILED"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{failedCount} Failed — Click to Review & Re-Vend</span>
          </Link>
        )}
      </div>

      {/* Quick Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Link
          href={`/admin/transactions${search ? `?q=${search}` : ''}`}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
            !status ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          All
        </Link>
        <Link
          href={`/admin/transactions?status=SUCCESS${search ? `&q=${search}` : ''}`}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
            status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          Successful
        </Link>
        <Link
          href={`/admin/transactions?status=FAILED${search ? `&q=${search}` : ''}`}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
            status === 'FAILED' || status === 'VENDING_FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          Failed (Needs Re-Vend)
        </Link>
        <Link
          href={`/admin/transactions?status=VENDING_PENDING${search ? `&q=${search}` : ''}`}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
            status === 'VENDING_PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          Pending
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form className="flex-1 flex flex-wrap items-center gap-4 w-full" method="GET">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text" 
              name="q"
              defaultValue={search}
              placeholder="Search reference, phone, or destination..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-sm"
            />
          </div>
          
          <select 
            name="status"
            defaultValue={status}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed (All)</option>
            <option value="VENDING_FAILED">Vending Failed</option>
            <option value="VENDING_PENDING">Vending Pending</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
          </select>
          
          <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filter
          </button>
          
          {(search || status) && (
            <Link href="/admin/transactions" className="text-neutral-400 hover:text-white text-sm font-medium">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Transactions Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/70 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Customer / Payer</th>
                <th className="px-6 py-4 font-semibold">Service & Destination</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status & Diagnostics</th>
                <th className="px-6 py-4 font-semibold text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {transactions?.map((tx: any) => {
                const profile = tx.user_id ? profilesMap[tx.user_id] : null;
                const services: any = tx.services;
                const products: any = tx.products;
                const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Service';
                const productName = products?.name || (Array.isArray(products) && products[0]?.name);

                return (
                  <tr key={tx.id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-emerald-400">{tx.qsn_reference}</div>
                      {tx.payment_reference && (
                        <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                          M-Pesa: {tx.payment_reference}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-neutral-400 text-xs">
                      {new Date(tx.created_at).toLocaleString('en-KE', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        timeZone: 'Africa/Nairobi'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {profile?.full_name || 'Guest User'}
                      </div>
                      <div className="text-xs font-mono text-neutral-500">
                        {profile?.phone || tx.guest_phone || 'Direct Checkout'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{serviceName}</div>
                      {productName && (
                        <div className="text-xs text-neutral-400 truncate max-w-[180px]">
                          {productName}
                        </div>
                      )}
                      <div className="text-xs font-mono text-emerald-400 mt-0.5">{tx.destination}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white whitespace-nowrap">
                      KES {Number(tx.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <StatusBadge status={tx.status} />
                      {tx.failure_reason && (
                        <div 
                          className="mt-1 text-[11px] text-red-400/90 font-mono line-clamp-2 leading-tight" 
                          title={tx.failure_reason}
                        >
                          {tx.failure_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick Re-Vend button for failed or pending items with payment */}
                        <RevendButton
                          transactionId={tx.id}
                          qsnReference={tx.qsn_reference}
                          status={tx.status}
                          hasPaymentRef={Boolean(tx.payment_reference)}
                        />

                        {/* Detail Link */}
                        <Link 
                          href={`/admin/transactions/${tx.id}`}
                          title="View Full Audit"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white text-neutral-400 transition-colors"
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-neutral-500">
                    <div className="max-w-sm mx-auto">
                      <p className="text-base font-semibold text-neutral-400 mb-1">No transactions found</p>
                      <p className="text-xs text-neutral-500">
                        {search || status 
                          ? 'Try changing or clearing your search filters above.'
                          : 'Transactions will appear here as soon as payments are initiated.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {count && count > limit && (
          <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-sm text-neutral-400">
              Showing <span className="text-white font-medium">{from + 1}</span> to <span className="text-white font-medium">{Math.min(to + 1, count)}</span> of <span className="text-white font-medium">{count}</span> results
            </span>
            <div className="flex gap-2">
              <Link 
                href={`/admin/transactions?page=${page > 1 ? page - 1 : 1}&q=${search}&status=${status}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${page <= 1 ? 'bg-neutral-900 text-neutral-600 pointer-events-none' : 'bg-neutral-800 hover:bg-neutral-700 text-white transition-colors'}`}
              >
                Previous
              </Link>
              <Link 
                href={`/admin/transactions?page=${page + 1}&q=${search}&status=${status}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${to + 1 >= count ? 'bg-neutral-900 text-neutral-600 pointer-events-none' : 'bg-neutral-800 hover:bg-neutral-700 text-white transition-colors'}`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={12} /> {status}
      </span>
    );
  }
  if (status.includes('FAILED') || status === 'TIMEOUT' || status === 'REVERSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle size={12} /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={12} /> {status}
    </span>
  );
}
