'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
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
        map.set(date, { date, revenue: 0, profit: 0 });
      }
      if (tx.status === 'COMPLETED') {
        const current = map.get(date);
        current.revenue += Number(tx.amount);
        current.profit += Number(tx.fee);
      }
    });
    return Array.from(map.values());
  }, [filteredData]);

  const servicePerformance = useMemo(() => {
    const map = new Map();
    filteredData.forEach(tx => {
      if (tx.status === 'COMPLETED') {
        const serviceName = tx.services?.name || 'Unknown';
        if (!map.has(serviceName)) {
          map.set(serviceName, { name: serviceName, volume: 0, revenue: 0 });
        }
        const current = map.get(serviceName);
        current.volume += 1;
        current.revenue += Number(tx.amount);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, tx) => {
      if (tx.status === 'COMPLETED') {
        acc.revenue += Number(tx.amount);
        acc.profit += Number(tx.fee);
        acc.count += 1;
      }
      return acc;
    }, { revenue: 0, profit: 0, count: 0 });
  }, [filteredData]);

  const exportCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Amount', 'Fee', 'Status', 'Service'];
    const rows = filteredData.map(tx => [
      format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
      tx.id,
      tx.amount,
      tx.fee,
      tx.status,
      tx.services?.name || 'Unknown'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `qasinet-report-${dateRange}-${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          <button
            onClick={() => setDateRange('7d')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateRange === '7d' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateRange === '30d' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            Last 30 Days
          </button>
        </div>
        
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm font-medium text-neutral-400 mb-1">Gross Revenue</p>
          <p className="text-3xl font-bold text-white">KES {totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm font-medium text-neutral-400 mb-1">Estimated Profit</p>
          <p className="text-3xl font-bold text-emerald-400">KES {totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm font-medium text-neutral-400 mb-1">Successful Transactions</p>
          <p className="text-3xl font-bold text-white">{totals.count.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-6">Revenue & Profit Over Time</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `K${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#e5e5e5' }}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-6">Revenue by Service</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicePerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `K${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', borderRadius: '8px' }}
                  cursor={{fill: '#262626'}}
                />
                <Bar dataKey="revenue" name="Revenue (KES)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
