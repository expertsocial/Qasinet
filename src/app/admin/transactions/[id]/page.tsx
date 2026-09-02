import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function TransactionDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch transaction details
  const { data: tx, error } = await supabase
    .from('transactions')
    .select(`
      *,
      services(name),
      service_providers(name),
      products(name),
      profiles(full_name, phone, email)
    `)
    .eq('id', id)
    .single();

  if (error || !tx) {
    notFound();
  }

  // Fetch timeline events
  const { data: events } = await supabase
    .from('transaction_events')
    .select('*')
    .eq('transaction_id', id)
    .order('created_at', { ascending: true });

  // Fetch kyanda callbacks/responses
  const { data: kyandaEvents } = await supabase
    .from('kyanda_transactions')
    .select('*')
    .eq('transaction_id', id)
    .order('created_at', { ascending: true });

  const { data: webhooks } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('provider_reference', tx.kyanda_reference || 'unknown')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/transactions" className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Transaction Details
            <StatusBadge status={tx.status} />
          </h2>
          <p className="text-neutral-400 font-mono text-sm mt-1">{tx.qsn_reference}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer & Destination */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Name</dt>
              <dd className="font-medium text-white">{/* @ts-ignore */ tx.profiles?.full_name || 'Guest User'}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Account Phone</dt>
              <dd className="font-medium text-white">{/* @ts-ignore */ tx.profiles?.phone || tx.guest_phone || 'Unknown'}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Destination Account</dt>
              <dd className="font-medium text-emerald-400">{tx.destination}</dd>
            </div>
          </dl>
        </div>

        {/* Product & Service */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Service Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Provider</dt>
              <dd className="font-medium text-white">{/* @ts-ignore */ tx.service_providers?.name}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Service / Product</dt>
              <dd className="font-medium text-white">
                {/* @ts-ignore */}
                {tx.services?.name} {tx.products ? `— ${tx.products.name}` : ''}
              </dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Kyanda Reference</dt>
              <dd className="font-mono text-emerald-400">{tx.kyanda_reference || 'Pending/None'}</dd>
            </div>
          </dl>
        </div>

        {/* Financials (Admin Only) */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Financials (Confidential)</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Face Value</dt>
              <dd className="font-medium text-white">KES {tx.amount}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Selling Price (Customer Pays)</dt>
              <dd className="font-medium text-white">KES {tx.selling_price}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-3">
              <dt className="text-neutral-400">Provider Cost (We Pay)</dt>
              <dd className="font-medium text-red-400">KES {tx.provider_cost}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Calculated Profit</dt>
              <dd className="font-bold text-emerald-500">KES {tx.profit}</dd>
            </div>
          </dl>
        </div>
        
        {/* Failure Reason */}
        {tx.failure_reason && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 shadow-sm">
             <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} />
              Failure Reason
            </h3>
            <p className="text-sm text-red-300">{tx.failure_reason}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-white mb-6">Status Timeline</h3>
        <div className="space-y-6">
          {events?.map((event, i) => (
            <div key={event.id} className="relative flex gap-4">
              {i !== events.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-neutral-800" />
              )}
              <div className="mt-1 h-6 w-6 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center shrink-0 z-10">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{event.status}</p>
                <p className="text-xs text-neutral-500 mb-1">
                  {new Date(event.created_at).toLocaleString()}
                </p>
                {event.details && (
                  <pre className="text-xs text-neutral-400 bg-neutral-900 p-2 rounded border border-neutral-800 mt-2 overflow-x-auto">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks / API Events for Debugging */}
      {(((kyandaEvents?.length ?? 0) > 0) || ((webhooks?.length ?? 0) > 0)) && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Raw Provider Events</h3>
          <div className="space-y-4">
            {webhooks?.map(wh => (
              <div key={wh.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded">WEBHOOK: {wh.event_type}</span>
                  <span className="text-xs text-neutral-500">{new Date(wh.created_at).toLocaleString()}</span>
                </div>
                <pre className="text-xs text-neutral-400 overflow-x-auto">
                  {JSON.stringify(wh.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
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
