'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Wallet, Activity, CheckCircle2, XCircle, Clock, AlertTriangle, 
  TrendingUp, ArrowUpRight, RefreshCw, ShieldCheck, Zap, 
  ExternalLink, ChevronRight, Layers, ArrowRight, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionItem {
  id: string;
  qsn_reference: string;
  amount: number;
  profit: number;
  destination: string;
  guest_phone?: string;
  status: string;
  created_at: string;
  payment_reference?: string;
  kyanda_reference?: string;
  services?: any;
}

interface DashboardProps {
  summary: {
    todaySales: number;
    todayProfit: number;
    totalTransactions: number;
    successfulCount: number;
    failedCount: number;
    pendingCount: number;
    kyandaBalance: number;
    kyandaEarnings: number;
    kyandaStatus: string;
  };
  chartData: Array<{ date: string; sales: number; profit: number; volume: number }>;
  serviceData: Array<{ name: string; value: number }>;
  recentTransactions: TransactionItem[];
}

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];

export default function DashboardClient({ summary, chartData, serviceData, recentTransactions }: DashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const successRate = summary.totalTransactions > 0 
    ? ((summary.successfulCount / (summary.successfulCount + summary.failedCount || 1)) * 100).toFixed(1)
    : '100';

  const isFloatLow = summary.kyandaBalance < 500 && summary.kyandaStatus === 'Connected';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Top Controls & Greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Operations Center
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Feed
            </span>
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time telemetry, revenue analytics, and provider float controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/transactions?status=VENDING_PENDING"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{summary.pendingCount} Pending</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-400")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Float & Gateway Alert Banners */}
      {summary.kyandaStatus === 'Disconnected' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg shadow-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-red-300">Kyanda Gateway Offline</h3>
              <p className="text-xs text-red-400/80">API communication failed. Check credentials or Kyanda endpoint health.</p>
            </div>
          </div>
          <Link href="/admin/kyanda" className="text-xs font-semibold underline shrink-0">
            Diagnose Provider &rarr;
          </Link>
        </div>
      )}

      {isFloatLow && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-amber-300">Low Provider Float Warning</h3>
              <p className="text-xs text-amber-400/80">Kyanda balance is KES {summary.kyandaBalance.toLocaleString()}. Top up now to prevent vending delays.</p>
            </div>
          </div>
          <Link href="/admin/kyanda" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold shrink-0">
            Top Up Float
          </Link>
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-sm group hover:border-neutral-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            KES {summary.todaySales.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Volume</span>
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-sm group hover:border-neutral-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Today's Profit</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            KES {summary.todayProfit.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Net commissions & convenience fees</span>
          </div>
        </div>

        {/* Kyanda Main Float */}
        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-sm group hover:border-neutral-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Kyanda Float</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            KES {summary.kyandaBalance.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Earnings: KES {summary.kyandaEarnings.toLocaleString()}</span>
            <span className={cn("font-bold text-[11px]", summary.kyandaStatus === 'Connected' ? "text-emerald-400" : "text-red-400")}>
              {summary.kyandaStatus}
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-sm group hover:border-neutral-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Success Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {successRate}%
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-emerald-400 font-semibold">{summary.successfulCount} Ok</span>
            <span>&bull;</span>
            <span className="text-red-400 font-semibold">{summary.failedCount} Failed</span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Revenue Trend (2 Columns) */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Revenue & Profit Trajectory</h2>
              <p className="text-xs text-neutral-400">Daily gross volume vs net margins over the last 7 days.</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-neutral-300">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-neutral-300">Profit</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="profit" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                No recent transaction history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Service Popularity Breakdown (1 Column) */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Service Distribution</h2>
            <p className="text-xs text-neutral-400">Share of transactions by utility category.</p>
          </div>

          <div className="h-52 w-full my-4 flex items-center justify-center">
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '10px', fontSize: '12px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-neutral-500 text-xs">No utility share data available</div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-800/60">
            {serviceData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-neutral-300 font-medium">{entry.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{entry.value} txs</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Live Recent Transactions Feed */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Recent Transactions
              <span className="text-xs font-normal text-neutral-400">({recentTransactions.length} latest)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time incoming payment events & vending executions.</p>
          </div>

          <Link
            href="/admin/transactions"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>View All Transactions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-900/60 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {recentTransactions.map((tx) => {
                const services: any = tx.services;
                const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Airtime';
                
                return (
                  <tr key={tx.id} className="hover:bg-neutral-900/40 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-neutral-200">
                      <Link href={`/admin/transactions/${tx.id}`} className="hover:text-emerald-400 transition-colors">
                        {tx.qsn_reference}
                      </Link>
                      {tx.payment_reference && (
                        <span className="block text-[10px] text-neutral-500 font-mono">
                          M-Pesa: {tx.payment_reference}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{serviceName}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-300">
                      {tx.destination}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">KES {Number(tx.amount).toLocaleString()}</span>
                      {tx.profit > 0 && (
                        <span className="block text-[10px] text-emerald-400 font-medium">
                          +KES {Number(tx.profit).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4 text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/transactions/${tx.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                      >
                        <span>Audit</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No transactions recorded today yet.
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        SUCCESS
      </span>
    );
  }
  if (status === 'PAYMENT_PENDING' || status === 'VENDING_PENDING' || status === 'CREATED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
        <Clock className="w-3 h-3" />
        {status === 'VENDING_PENDING' ? 'VENDING' : 'PENDING'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3 h-3" />
      FAILED
    </span>
  );
}
