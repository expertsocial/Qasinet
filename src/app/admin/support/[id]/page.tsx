import { createClient } from '@/lib/supabase/server';
import { LifeBuoy, ArrowLeft, Calendar, User, Tag, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import TicketDetailClient from './TicketDetailClient';

export default async function SupportTicketPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select(`
      *,
      auth_users:user_id (email),
      admins:assigned_to (email)
    `)
    .eq('id', params.id)
    .single();

  if (!ticket) {
    notFound();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/admin/support" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Support Tickets
      </Link>
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="text-blue-500" />
            Ticket Details
          </h1>
          <p className="text-neutral-400 mt-1 font-mono text-sm">{ticket.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Customer Description</h3>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-neutral-300 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>
          
          <TicketDetailClient ticket={ticket} />
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Ticket Info</h3>
            
            <div className="flex items-start gap-3">
              <User size={18} className="text-neutral-500 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-500">Customer</p>
                <p className="text-sm font-medium text-neutral-200">{ticket.auth_users?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag size={18} className="text-neutral-500 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-500">Category</p>
                <p className="text-sm font-medium text-neutral-200">{ticket.category}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-neutral-500 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-500">Created At</p>
                <p className="text-sm font-medium text-neutral-200">{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>

            {ticket.transaction_id && (
              <div className="flex items-start gap-3 pt-4 border-t border-neutral-800">
                <ReceiptText size={18} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs text-neutral-500">Linked Transaction</p>
                  <Link href={`/admin/transactions/${ticket.transaction_id}`} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    View Transaction
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
