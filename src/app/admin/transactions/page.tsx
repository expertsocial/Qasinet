import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search, Filter, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const query = supabase
    .from('transactions')
    .select('*, services(name), profiles(full_name, phone)', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Handle Search and Filters
  const search = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  if (search) {
    query.or(`qsn_reference.ilike.%${search}%,kyanda_reference.ilike.%${search}%,destination.ilike.%${search}%`);
  }

  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  if (status) {
    query.eq('status', status);
  }

  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const limit = 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query.range(from, to);

  const { data: transactions, count } = await query;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Transactions</h2>
          <p className="text-neutral-400 text-sm mt-1">Manage and monitor all system transactions.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form className="flex-1 flex items-center gap-4 w-full" method="GET">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text" 
              name="q"
              defaultValue={search}
              placeholder="Search ref, phone, account..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
            />
          </div>
          
          <select 
            name="status"
            defaultValue={status}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="VENDING_PENDING">Pending</option>
            <option value="VENDING_FAILED">Failed</option>
          </select>
          
          <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Filter size={18} />
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
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/50 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {transactions?.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-emerald-500">{tx.qsn_reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString('en-US', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {/* @ts-ignore */}
                      {tx.profiles?.full_name || 'Guest'}
                    </div>
                    {/* @ts-ignore */}
                    <div className="text-xs text-neutral-500">{tx.profiles?.phone || tx.guest_phone || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {/* @ts-ignore */}
                    <div className="font-medium">{tx.services?.name}</div>
                    <div className="text-xs text-neutral-500">{tx.destination}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">KES {tx.amount}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/transactions/${tx.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              
              {!transactions?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No transactions found matching your criteria.
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
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle size={12} /> {status}</span>;
  }
  if (status.includes('FAILED') || status === 'TIMEOUT' || status === 'REVERSED') {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><XCircle size={12} /> {status}</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock size={12} /> {status}</span>;
}
