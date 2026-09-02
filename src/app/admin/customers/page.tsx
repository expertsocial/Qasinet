import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search, ArrowRight, UserCircle } from 'lucide-react';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Handle Search
  const search = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  if (search) {
    query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const limit = 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query.range(from, to);

  const { data: customers, count } = await query;

  // Fetch aggregated data for these customers (tx count, total spend)
  const customerIds = customers?.map(c => c.id) || [];
  let aggregates: Record<string, { count: number, total: number }> = {};
  
  if (customerIds.length > 0) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('user_id, amount')
      .in('user_id', customerIds)
      .eq('status', 'SUCCESS');
      
    aggregates = (txs || []).reduce((acc, tx) => {
      if (tx.user_id) {
        if (!acc[tx.user_id]) acc[tx.user_id] = { count: 0, total: 0 };
        acc[tx.user_id].count += 1;
        acc[tx.user_id].total += Number(tx.amount);
      }
      return acc;
    }, {} as Record<string, { count: number, total: number }>);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Customers</h2>
          <p className="text-neutral-400 text-sm mt-1">Manage and view registered QasiNet users.</p>
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
              placeholder="Search name, phone, email..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
            />
          </div>
          
          <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Search
          </button>
          
          {search && (
            <Link href="/admin/customers" className="text-neutral-400 hover:text-white text-sm font-medium">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/50 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Registered</th>
                <th className="px-6 py-4 font-medium text-right">Success Tx</th>
                <th className="px-6 py-4 font-medium text-right">Total Spent</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {customers?.map((customer) => {
                const stats = aggregates[customer.id] || { count: 0, total: 0 };
                return (
                  <tr key={customer.id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <UserCircle size={18} />
                        </div>
                        <span className="font-medium text-white">{customer.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{customer.phone}</div>
                      <div className="text-xs text-neutral-500">{customer.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-right text-white">
                      {stats.count}
                    </td>
                    <td className="px-6 py-4 font-medium text-right text-emerald-400">
                      KES {stats.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              
              {!customers?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    No customers found matching your criteria.
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
                href={`/admin/customers?page=${page > 1 ? page - 1 : 1}&q=${search}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${page <= 1 ? 'bg-neutral-900 text-neutral-600 pointer-events-none' : 'bg-neutral-800 hover:bg-neutral-700 text-white transition-colors'}`}
              >
                Previous
              </Link>
              <Link 
                href={`/admin/customers?page=${page + 1}&q=${search}`}
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
