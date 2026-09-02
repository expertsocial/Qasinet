import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, Calendar, Activity, ShieldAlert } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: customer, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) {
    notFound();
  }

  // Fetch Transaction History (Recent 10)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, services(name)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Aggregates
  const successfulTxs = transactions?.filter(tx => tx.status === 'SUCCESS') || [];
  const totalSpent = successfulTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers" className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Customer Profile
          </h2>
          <p className="text-neutral-400 text-sm mt-1">{customer.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-neutral-800">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <User size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{customer.full_name}</h3>
              <p className="text-neutral-400 flex items-center gap-2 mt-1">
                <Calendar size={14} /> Registered {new Date(customer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <dt className="text-neutral-500 flex items-center gap-2 mb-1"><Phone size={14}/> Phone Number</dt>
              <dd className="font-medium text-white text-base">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 flex items-center gap-2 mb-1"><Mail size={14}/> Email Address</dt>
              <dd className="font-medium text-white text-base">{customer.email || 'Not provided'}</dd>
            </div>
          </dl>
        </div>

        {/* Stats Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col justify-center space-y-6">
          <div>
            <p className="text-neutral-400 text-sm mb-1 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500"/> Lifetime Spend
            </p>
            <p className="text-3xl font-bold text-white">KES {totalSpent.toLocaleString()}</p>
          </div>
          <div className="pt-6 border-t border-neutral-800">
             <p className="text-neutral-400 text-sm mb-1">Recent Transactions</p>
             <p className="text-xl font-bold text-white">{transactions?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <ShieldAlert size={18} /> Danger Zone / Admin Actions
        </h3>
        <p className="text-sm text-neutral-400 mb-6">Actions taken here are logged in the audit trail.</p>
        
        <div className="flex flex-wrap gap-4">
          <form action="/api/admin/customers/suspend" method="POST">
             <input type="hidden" name="customerId" value={customer.id} />
             <button type="submit" className="bg-neutral-900 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors">
               Suspend Account
             </button>
          </form>
          <form action="/api/admin/customers/reset-password" method="POST">
             <input type="hidden" name="customerId" value={customer.id} />
             <button type="submit" className="bg-neutral-900 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 px-4 py-2 rounded-lg font-medium transition-colors">
               Force Password Reset
             </button>
          </form>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Link href={`/admin/transactions?q=${customer.phone}`} className="text-sm text-emerald-500 hover:text-emerald-400 font-medium">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/50 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {transactions?.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-emerald-500">
                    <Link href={`/admin/transactions/${tx.id}`}>{tx.qsn_reference}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {/* @ts-ignore */}
                    <div className="font-medium">{tx.services?.name}</div>
                    <div className="text-xs text-neutral-500">{tx.destination}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">KES {tx.amount}</td>
                  <td className="px-6 py-4">{tx.status}</td>
                </tr>
              ))}
              {!transactions?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No transactions yet.
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
