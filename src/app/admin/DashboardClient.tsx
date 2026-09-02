'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Wallet, Activity, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

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
  chartData: Array<{ date: string, sales: number, profit: number, volume: number }>;
  serviceData: Array<{ name: string, value: number }>;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function DashboardClient({ summary, chartData, serviceData }: DashboardProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Kyanda Status Banner */}
      {summary.kyandaStatus === 'Disconnected' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={24} />
          <div>
            <h3 className="font-semibold">Kyanda Connection Error</h3>
            <p className="text-sm">Unable to connect to the Kyanda API. Check credentials or network status.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Sales" 
          value={`KES ${summary.todaySales.toLocaleString()}`} 
          icon={<Wallet className="text-emerald-500" />} 
        />
        <StatCard 
          title="Today's Profit" 
          value={`KES ${summary.todayProfit.toLocaleString()}`} 
          icon={<TrendingUp className="text-emerald-500" />} 
        />
        <StatCard 
          title="Kyanda Float" 
          value={`KES ${summary.kyandaBalance.toLocaleString()}`} 
          icon={<Activity className="text-blue-500" />} 
        />
        <StatCard 
          title="Kyanda Earnings" 
          value={`KES ${summary.kyandaEarnings.toLocaleString()}`} 
          icon={<Wallet className="text-blue-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Successful (Today)" 
          value={summary.successfulCount.toString()} 
          icon={<CheckCircle className="text-emerald-500" />} 
        />
        <StatCard 
          title="Failed (Today)" 
          value={summary.failedCount.toString()} 
          icon={<XCircle className="text-red-500" />} 
        />
        <StatCard 
          title="Pending (Today)" 
          value={summary.pendingCount.toString()} 
          icon={<Clock className="text-amber-500" />} 
        />
        <StatCard 
          title="Total Transactions" 
          value={summary.totalTransactions.toLocaleString()} 
          icon={<Activity className="text-purple-500" />} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Sales (Last 7 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
              <Tooltip 
                cursor={{ fill: '#333', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }} 
              />
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Profit (Last 7 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }} 
              />
              <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Transaction Volume">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#333', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }} 
              />
              <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Service Popularity">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {serviceData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm text-neutral-400">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-neutral-400 font-medium text-sm">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-white font-medium mb-6">{title}</h3>
      {children}
    </div>
  );
}
