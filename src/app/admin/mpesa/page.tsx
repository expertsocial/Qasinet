import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Smartphone,
  Zap,
  Tv,
  Droplets,
  Wifi,
  ExternalLink,
  Receipt,
  Calendar
} from 'lucide-react';
import { ExportCsvButton, type MpesaCsvRow } from './ExportCsvButton';

export const dynamic = 'force-dynamic';

export default async function MpesaReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 1. Enforce Admin Authentication
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const resolvedParams = await searchParams;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  // Base query: Only transactions that have received a confirmed M-Pesa receipt code
  // Pending STK pushes temporarily hold 'ws_CO_...' in payment_reference
  const query = supabaseService
    .from('transactions')
    .select(`
      id,
      qsn_reference,
      payment_reference,
      guest_phone,
      destination,
      amount,
      status,
      failure_reason,
      created_at,
      updated_at,
      user_id,
      services!inner (
        name,
        slug,
        type
      ),
      products (
        name
      ),
      payments (
        created_at,
        reference,
        method,
        status
      )
    `, { count: 'exact' })
    .not('payment_reference', 'is', null)
    .not('payment_reference', 'like', 'ws_%')
    .order('created_at', { ascending: false });

  // Handle Search Query (M-Pesa code, phone, destination, or QSN reference)
  const search = typeof resolvedParams.q === 'string' ? resolvedParams.q.trim() : '';
  if (search) {
    query.or(`payment_reference.ilike.%${search}%,guest_phone.ilike.%${search}%,destination.ilike.%${search}%,qsn_reference.ilike.%${search}%`);
  }

  // Handle Service Type Filter
  const serviceType = typeof resolvedParams.serviceType === 'string' ? resolvedParams.serviceType.trim() : '';
  if (serviceType) {
    query.eq('services.type', serviceType);
  }

  // Handle Status Filter
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status.trim() : '';
  if (status) {
    if (status === 'SUCCESS') {
      query.in('status', ['SUCCESS', 'COMPLETED']);
    } else if (status === 'REFUND_PENDING') {
      query.or('status.eq.VENDING_FAILED_REFUND_PENDING,failure_reason.ilike.%[REFUND_PENDING]%');
    } else if (status === 'FAILED') {
      query.in('status', ['VENDING_FAILED', 'PAYMENT_FAILED', 'TIMEOUT', 'FAILED']);
    } else {
      query.eq('status', status);
    }
  }

  // Handle Date Range
  const fromDate = typeof resolvedParams.from === 'string' ? resolvedParams.from.trim() : '';
  if (fromDate) {
    query.gte('created_at', `${fromDate}T00:00:00.000Z`);
  }

  const toDate = typeof resolvedParams.to === 'string' ? resolvedParams.to.trim() : '';
  if (toDate) {
    query.lte('created_at', `${toDate}T23:59:59.999Z`);
  }

  // Pagination (25 per page)
  const page = typeof resolvedParams.page === 'string' ? Math.max(1, parseInt(resolvedParams.page)) : 1;
  const limit = 25;
  const rangeFrom = (page - 1) * limit;
  const rangeTo = rangeFrom + limit - 1;

  query.range(rangeFrom, rangeTo);

  const { data: transactions, count, error } = await query;

  if (error) {
    console.error('[Admin M-Pesa] Query error:', error);
  }

  // Batch fetch profiles for any user_ids to resolve payer phone when guest_phone is null
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

  // Format data for CSV Export
  const csvRows: MpesaCsvRow[] = (transactions || []).map((tx: any) => {
    const profile = tx.user_id ? profilesMap[tx.user_id] : null;
    const payerPhone = tx.guest_phone || profile?.phone || tx.destination || 'N/A';
    const confirmedAtDate = tx.payments?.[0]?.created_at || tx.updated_at || tx.created_at;
    const services = tx.services as any;
    const serviceName = services?.name || 'Unknown Service';
    const serviceTypeName = services?.type || 'general';

    return {
      mpesa_receipt: tx.payment_reference || '',
      qsn_reference: tx.qsn_reference || '',
      payer_phone: payerPhone,
      recipient_destination: tx.destination || '',
      confirmed_at: new Date(confirmedAtDate).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      service_type: serviceTypeName,
      service_name: serviceName,
      amount: Number(tx.amount || 0),
      status: tx.status,
      transaction_id: tx.id
    };
  });

  // Calculate summary metrics on current page
  const totalAmountOnPage = (transactions || []).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  const successCountOnPage = (transactions || []).filter((t: any) => t.status === 'SUCCESS' || t.status === 'COMPLETED').length;
  const refundCountOnPage = (transactions || []).filter((t: any) => t.status === 'VENDING_FAILED_REFUND_PENDING' || t.failure_reason?.includes('[REFUND_PENDING]')).length;
  const overdueRefundCountOnPage = (transactions || []).filter((t: any) => {
    const isRef = t.status === 'VENDING_FAILED_REFUND_PENDING' || t.failure_reason?.includes('[REFUND_PENDING]');
    if (!isRef) return false;
    const diffMs = Date.now() - new Date(t.created_at).getTime();
    return diffMs >= 2 * 60 * 60 * 1000; // 2h staleness SLA
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Receipt className="w-3.5 h-3.5" />
            <span>Safaricom Reconciliation Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            M-Pesa Transaction Logs
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Reconcile Safaricom M-Pesa receipts against QasiNet orders, payer phone numbers, confirmation timestamps, and service fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportCsvButton rows={csvRows} totalFilteredCount={count || 0} />
          <Link
            href="/admin/transactions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-medium text-sm transition-colors"
          >
            <span>General Transactions</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Reconciled Records</div>
          <div className="text-2xl font-bold text-white mt-1.5 font-mono">
            {count ?? 0}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Confirmed Daraja receipt callbacks
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Volume (Filtered View)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            KES {totalAmountOnPage.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Across {transactions?.length || 0} visible orders
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Fulfilled Successfully</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            {successCountOnPage}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Vending complete & delivered
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Refund / Exceptions</div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {refundCountOnPage}
            </span>
            {overdueRefundCountOnPage > 0 && (
              <span className="text-[11px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                {overdueRefundCountOnPage} OVERDUE (&gt;2h)
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Paid on M-Pesa, awaiting re-vend/refund
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <form className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center" method="GET">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              name="q"
              defaultValue={search}
              placeholder="Search M-Pesa receipt, phone, destination..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            />
          </div>

          {/* Service Type Dropdown */}
          <div className="w-full sm:w-auto">
            <select 
              name="serviceType"
              defaultValue={serviceType}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            >
              <option value="">All Services</option>
              <option value="airtime">Airtime</option>
              <option value="data">Data Bundles</option>
              <option value="electricity">Electricity (KPLC)</option>
              <option value="tv">TV Subscriptions</option>
              <option value="water">Water Utility</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full sm:w-auto">
            <select 
              name="status"
              defaultValue={status}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success / Completed</option>
              <option value="REFUND_PENDING">Refund / Re-vend Pending</option>
              <option value="FAILED">Failed (Vending / Timeout)</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-neutral-400 shrink-0">From:</span>
            <input 
              type="date"
              name="from"
              defaultValue={fromDate}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-neutral-400 shrink-0">To:</span>
            <input 
              type="date"
              name="to"
              defaultValue={toDate}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Filter and Clear Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm"
            >
              <Filter size={15} />
              <span>Filter</span>
            </button>
            
            {(search || serviceType || status || fromDate || toDate) && (
              <Link 
                href="/admin/mpesa" 
                className="text-neutral-400 hover:text-white text-sm font-medium px-2 py-2"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 font-semibold">M-Pesa Receipt Code</th>
                <th className="px-5 py-3.5 font-semibold">Payer Phone & Destination</th>
                <th className="px-5 py-3.5 font-semibold">Payment Confirmed At</th>
                <th className="px-5 py-3.5 font-semibold">Service Type</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Fulfillment Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {transactions?.map((tx: any) => {
                const profile = tx.user_id ? profilesMap[tx.user_id] : null;
                const payerPhone = tx.guest_phone || profile?.phone || tx.destination || 'N/A';
                const isGift = tx.destination && tx.destination !== payerPhone;
                const services: any = tx.services;
                const products: any = tx.products;
                const serviceName = services?.name || 'Service';
                const serviceTypeStr = services?.type || 'general';
                const productName = products?.name;
                
                // M-Pesa payment confirmation timestamp from payments table (fallback to updated_at)
                const confirmedTimestamp = tx.payments?.[0]?.created_at || tx.updated_at || tx.created_at;
                const confirmedDate = new Date(confirmedTimestamp);

                return (
                  <tr key={tx.id} className="hover:bg-neutral-900/40 transition-colors">
                    {/* 1. M-Pesa Receipt Code */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-emerald-400 tracking-wide">
                          {tx.payment_reference}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                        {tx.qsn_reference}
                      </div>
                    </td>

                    {/* 2. Payer Phone & Destination */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-medium text-white text-sm">
                        {payerPhone}
                      </div>
                      {isGift ? (
                        <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                          <span className="text-[10px] uppercase font-semibold text-neutral-500 px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800">
                            Recipient
                          </span>
                          <span className="font-mono text-emerald-400/90">{tx.destination}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-500">
                          {profile?.full_name ? `${profile.full_name} (Account)` : 'Direct M-Pesa Payer'}
                        </div>
                      )}
                    </td>

                    {/* 3. Confirmation Timestamp */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-neutral-200">
                        {confirmedDate.toLocaleString('en-KE', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Africa/Nairobi'
                        })}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        EAT (Safaricom Time)
                      </div>
                    </td>

                    {/* 4. Service Type */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ServiceTypeBadge type={serviceTypeStr} />
                        <span className="font-medium text-white text-xs">{serviceName}</span>
                      </div>
                      {productName && (
                        <div className="text-[11px] text-neutral-400 truncate max-w-[180px] mt-0.5">
                          {productName}
                        </div>
                      )}
                    </td>

                    {/* 5. Amount */}
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-white text-sm">
                      KES {Number(tx.amount || 0).toLocaleString()}
                    </td>

                    {/* 6. Order / Transaction Status */}
                    <td className="px-5 py-4 max-w-xs">
                      <StatusBadge status={tx.status} createdAt={tx.created_at} />
                      {tx.failure_reason && (
                        <div 
                          className="mt-1 text-[11px] text-red-400/90 font-mono line-clamp-1 leading-tight" 
                          title={tx.failure_reason}
                        >
                          {tx.failure_reason}
                        </div>
                      )}
                    </td>

                    {/* 7. Action: Link to Detail */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link 
                        href={`/admin/transactions/${tx.id}`}
                        title="View Full Transaction Audit"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white text-neutral-400 transition-colors"
                      >
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-neutral-500">
                    <div className="max-w-sm mx-auto">
                      <Receipt className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                      <p className="text-base font-semibold text-neutral-400 mb-1">No M-Pesa receipts found</p>
                      <p className="text-xs text-neutral-500">
                        {search || serviceType || status || fromDate || toDate
                          ? 'Try adjusting or clearing your reconciliation filters above.'
                          : 'Transactions will appear here as soon as Safaricom Daraja payments are confirmed.'}
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
          <div className="px-6 py-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-neutral-400">
              Showing <span className="text-white font-medium">{rangeFrom + 1}</span> to{' '}
              <span className="text-white font-medium">{Math.min(rangeTo + 1, count)}</span> of{' '}
              <span className="text-white font-medium">{count}</span> reconciliation records
            </span>
            <div className="flex gap-2">
              <Link 
                href={`/admin/mpesa?page=${page > 1 ? page - 1 : 1}&q=${encodeURIComponent(search)}&serviceType=${encodeURIComponent(serviceType)}&status=${encodeURIComponent(status)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${page <= 1 ? 'bg-neutral-900 text-neutral-600 pointer-events-none' : 'bg-neutral-800 hover:bg-neutral-700 text-white transition-colors'}`}
              >
                Previous
              </Link>
              <Link 
                href={`/admin/mpesa?page=${page + 1}&q=${encodeURIComponent(search)}&serviceType=${encodeURIComponent(serviceType)}&status=${encodeURIComponent(status)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${rangeTo + 1 >= count ? 'bg-neutral-900 text-neutral-600 pointer-events-none' : 'bg-neutral-800 hover:bg-neutral-700 text-white transition-colors'}`}
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

function ServiceTypeBadge({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t === 'electricity') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Zap size={11} /> Electricity
      </span>
    );
  }
  if (t === 'airtime') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Smartphone size={11} /> Airtime
      </span>
    );
  }
  if (t === 'data') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Wifi size={11} /> Bundles
      </span>
    );
  }
  if (t === 'tv') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <Tv size={11} /> TV
      </span>
    );
  }
  if (t === 'water') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Droplets size={11} /> Water
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-800 text-neutral-300">
      {type}
    </span>
  );
}

function StatusBadge({ status, createdAt }: { status: string; createdAt?: string }) {
  if (status === 'SUCCESS' || status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={12} /> {status}
      </span>
    );
  }
  if (status === 'VENDING_FAILED_REFUND_PENDING' || status.includes('REFUND_PENDING')) {
    let isOverdue = false;
    let ageStr = '';
    if (createdAt) {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      isOverdue = diffMs >= 2 * 60 * 60 * 1000;
      ageStr = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`;
    }

    if (isOverdue) {
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse"
          title={`Refund pending for ${ageStr} (>2h SLA)`}
        >
          <Clock size={12} /> OVERDUE REFUND ({ageStr})
        </span>
      );
    }

    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30"
        title={`Refund pending for ${ageStr}`}
      >
        <Clock size={12} /> REFUND PENDING ({ageStr || 'Pending'})
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
