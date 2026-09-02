import { createClient } from '@/lib/supabase/server';
import { LifeBuoy, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminSupportPage() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      *,
      auth_users:user_id (email),
      admins:assigned_to (email)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="text-blue-500" />
            Support Tickets
          </h1>
          <p className="text-neutral-400 mt-1">Manage customer issues and complaints.</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket ID</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {tickets?.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                  {ticket.id.substring(0, 8)}...
                </td>
                <td className="px-4 py-3 text-neutral-200">
                  {ticket.auth_users?.email || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
                    {ticket.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ticket.status === 'OPEN' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Circle size={12} /> Open
                    </span>
                  ) : ticket.status === 'RESOLVED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                      <CheckCircle2 size={12} /> Closed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {format(new Date(ticket.created_at), 'MMM dd, HH:mm')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link 
                    href={`/admin/support/${ticket.id}`}
                    className="inline-block px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            
            {(!tickets || tickets.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-neutral-500">
                    <LifeBuoy size={48} className="mb-4 opacity-20" />
                    <p>No support tickets found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
