import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Zap, Copy, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';
import { TransactionActions } from './TransactionActions';

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  // Fetch transaction details with related service and product
  const { data: tx, error } = await supabaseService
    .from('transactions')
    .select(`
      *,
      services(name, slug, type),
      products(name, provider_product_id)
    `)
    .eq('id', id)
    .single();

  if (error || !tx) {
    notFound();
  }

  // Fetch customer profile separately if linked to a registered user
  let profile: { full_name?: string; phone?: string; email?: string } | null = null;
  if (tx.user_id) {
    const { data: p } = await supabaseService
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', tx.user_id)
      .maybeSingle();
    profile = p;
  }

  // Fetch timeline events
  const { data: events } = await supabaseService
    .from('transaction_events')
    .select('*')
    .eq('transaction_id', id)
    .order('created_at', { ascending: true });

  // Fetch raw webhook events
  const { data: webhooks } = await supabaseService
    .from('webhook_events')
    .select('*')
    .eq('provider_reference', tx.kyanda_reference || 'unknown')
    .order('created_at', { ascending: true });

  const token = tx.metadata?.token || events?.find((e: any) => e.details?.token)?.details?.token;
  const units = tx.metadata?.units || events?.find((e: any) => e.details?.units)?.details?.units;
  const services: any = tx.services;
  const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Airtime';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Bar with Back Button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/transactions" 
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Transaction Audit
              </h1>
              <StatusBadge status={tx.status} />
            </div>
            <p className="text-neutral-400 font-mono text-xs mt-0.5">{tx.qsn_reference}</p>
          </div>
        </div>
        
        {/* Dynamic Action Buttons */}
        <TransactionActions 
          transactionId={tx.id}
          qsnReference={tx.qsn_reference}
          status={tx.status}
          hasKyandaRef={!!tx.kyanda_reference}
          hasPaymentRef={!!tx.payment_reference}
        />
      </div>

      {/* KPLC TOKEN BANNER (If Token Exists) */}
      {token && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
            <Zap className="w-5 h-5 fill-current" />
            <span>KPLC PREPAID ELECTRICITY TOKEN</span>
          </div>
          <div className="bg-neutral-950 border border-amber-500/30 rounded-2xl p-5 text-center my-2">
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-mono mb-1">Generated Token</p>
            <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-widest py-1">
              {token}
            </p>
            {units && (
              <p className="text-xs text-neutral-400 mt-1 font-medium">
                Units: <strong className="text-white">{units} kWh</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Customer & Destination */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Customer & Recipient</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Account Name</dt>
              <dd className="font-semibold text-white">{profile?.full_name || tx.metadata?.accountName || 'Guest User'}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Payer Phone</dt>
              <dd className="font-mono text-white">{profile?.phone || tx.guest_phone || 'Direct Checkout'}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Destination Account / Meter</dt>
              <dd className="font-mono font-bold text-emerald-400">{tx.destination}</dd>
            </div>
          </dl>
        </div>

        {/* Service & Provider Details */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Service & Provider</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Service Category</dt>
              <dd className="font-semibold text-white">{serviceName}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">M-Pesa Receipt</dt>
              <dd className="font-mono font-bold text-primary">{tx.payment_reference || 'Pending/None'}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Kyanda Reference</dt>
              <dd className="font-mono text-neutral-200">{tx.kyanda_reference || 'Pending/None'}</dd>
            </div>
          </dl>
        </div>

        {/* Financial Margins */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Financial Ledger</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Face Value</dt>
              <dd className="font-bold text-white">KES {Number(tx.amount).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Customer Charged</dt>
              <dd className="font-medium text-white">KES {Number(tx.selling_price || tx.amount).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-800/60 pb-3">
              <dt className="text-neutral-400">Upstream Cost</dt>
              <dd className="font-medium text-neutral-400">KES {Number(tx.provider_cost || tx.amount).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-neutral-400">Net Profit</dt>
              <dd className="font-bold text-emerald-400">+KES {Number(tx.profit || 0).toFixed(2)}</dd>
            </div>
          </dl>
        </div>
        
        {/* Failure & Diagnostic Reason */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Status Diagnostics</h2>
          {tx.failure_reason ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Failure Reason Recorded:</span>
              </div>
              <p className="font-mono mt-1">{tx.failure_reason}</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>No errors reported. Transaction state is optimal.</span>
            </div>
          )}
          <div className="mt-4 text-xs text-neutral-500">
            Created: {new Date(tx.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
          </div>
        </div>

      </div>

      {/* Chronological Event Timeline */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-6">Chronological Event Timeline</h2>
        <div className="space-y-6">
          {events?.map((event: any, i: number) => (
            <div key={event.id} className="relative flex gap-4">
              {i !== events.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-neutral-800" />
              )}
              <div className="mt-1 h-6 w-6 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center shrink-0 z-10">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{event.status}</p>
                  <p className="text-xs text-neutral-500 font-mono">
                    {new Date(event.created_at).toLocaleTimeString('en-KE')}
                  </p>
                </div>
                {event.details && (
                  <pre className="text-xs text-neutral-400 bg-neutral-900/90 p-3 rounded-xl border border-neutral-800 mt-2 overflow-x-auto font-mono">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}

          {(!events || events.length === 0) && (
            <div className="text-neutral-500 text-xs py-4 text-center">No timeline events logged.</div>
          )}
        </div>
      </div>

      {/* Raw Provider Events */}
      {webhooks && webhooks.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Raw Webhook Payloads ({webhooks.length})</h2>
          <div className="space-y-4">
            {webhooks.map((wh: any) => (
              <div key={wh.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-mono">
                    {wh.provider} {wh.event_type}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">{new Date(wh.created_at).toLocaleString()}</span>
                </div>
                <pre className="text-xs text-neutral-300 overflow-x-auto font-mono bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
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
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        SUCCESS
      </span>
    );
  }
  if (status.includes('FAILED') || status === 'TIMEOUT' || status === 'REVERSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
      <Clock className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}
