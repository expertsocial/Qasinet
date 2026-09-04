'use client';

import { useMemo, useState } from 'react';
import { Download, Calendar, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function ReportsClient({ initialData }: { initialData: any[] }) {
  const [dateRange, setDateRange] = useState<'7d' | '30d'>('30d');

  const filteredData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (dateRange === '7d' ? 7 : 30));
    
    return initialData.filter(tx => 
      isWithinInterval(parseISO(tx.created_at), { start: startOfDay(startDate), end: endOfDay(now) })
    );
  }, [initialData, dateRange]);

  const dailyRevenue = useMemo(() => {
    const map = new Map();
    filteredData.forEach(tx => {
      const date = format(parseISO(tx.created_at), 'MMM dd');
      if (!map.has(date)) {
        map.set(date, { date, revenue: 0, profit: 0, volume: 0 });
      }
      if (tx.status === 'SUCCESS') {
        const current = map.get(date);
        current.revenue += Number(tx.amount || 0);
        current.profit += Number(tx.profit || 0);
        current.volume += 1;
      }
    });
    return Array.from(map.values());
  }, [filteredData]);

  const servicePerformance = useMemo(() => {
    const map = new Map();
    filteredData.forEach(tx => {
      if (tx.status === 'SUCCESS') {
        const services: any = tx.services;
        const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Airtime';
        if (!map.has(serviceName)) {
          map.set(serviceName, { name: serviceName, volume: 0, revenue: 0 });
        }
        const current = map.get(serviceName);
        current.volume += 1;
        current.revenue += Number(tx.amount || 0);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, tx) => {
      if (tx.status === 'SUCCESS') {
        acc.revenue += Number(tx.amount || 0);
        acc.profit += Number(tx.profit || 0);
        acc.count += 1;
      }
      return acc;
    }, { revenue: 0, profit: 0, count: 0 });
  }, [filteredData]);

  const exportCSV = () => {
    const headers = ['Date', 'QSN Reference', 'M-Pesa Receipt', 'Destination', 'Service', 'Amount (KES)', 'Net Profit (KES)', 'Status'];
    const rows = filteredData.map(tx => {
      const services: any = tx.services;
      const serviceName = services?.name || (Array.isArray(services) && services[0]?.name) || 'Airtime';
      
      return [
        format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
        tx.qsn_reference || tx.id,
        tx.payment_reference || 'N/A',
        `"${tx.destination || ''}"`,
        `"${serviceName}"`,
        tx.amount,
        tx.profit || 0,
        tx.status
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `qasinet-financial-ledger-${dateRange}-${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Date Toggle & Export Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-1">
          <button
            onClick={() => setDateRange('7d')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              dateRange === '7d' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              dateRange === '30d' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
        
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-4 h-4" />
          Export Financial CSV
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Gross Revenue ({dateRange})</p>
          <p className="text-3xl font-black text-white">
            KES {totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Net Profit ({dateRange})</p>
          <p className="text-3xl font-black text-emerald-400">
            KES {totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Successful Transactions</p>
          <p className="text-3xl font-black text-white">{totals.count.toLocaleString()}</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue & Profit Area Chart */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-6">Revenue & Profit Trajectory</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service Bar Chart */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-6">Revenue by Utility Category</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicePerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                  cursor={{ fill: '#262626', opacity: 0.4 }}
                />
                <Bar dataKey="revenue" name="Revenue (KES)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
