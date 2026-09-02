import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  // Today's Date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();
  
  // Fetch Today's Transactions
  const { data: todayTxs } = await supabase
    .from('transactions')
    .select('status, amount, profit')
    .gte('created_at', startOfDay);

  const todaySales = todayTxs?.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
  const todayProfit = todayTxs?.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + Number(tx.profit), 0) || 0;
  
  const successfulCount = todayTxs?.filter(tx => tx.status === 'SUCCESS').length || 0;
  const failedCount = todayTxs?.filter(tx => tx.status === 'PAYMENT_FAILED' || tx.status === 'VENDING_FAILED').length || 0;
  const pendingCount = (todayTxs?.length || 0) - successfulCount - failedCount;

  // Total Transactions (All time)
  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  // Fetch Chart Data (Last 7 days simplified for this phase)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('created_at, amount, profit, status, services(name)')
    .gte('created_at', sevenDaysAgo.toISOString())
    .eq('status', 'SUCCESS');

  // Process Chart Data
  const dailyDataMap = new Map<string, { date: string, sales: number, profit: number, volume: number }>();
  const servicePopularityMap = new Map<string, number>();

  recentTxs?.forEach(tx => {
    // Daily Map
    const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dailyDataMap.has(dateStr)) {
      dailyDataMap.set(dateStr, { date: dateStr, sales: 0, profit: 0, volume: 0 });
    }
    const dayData = dailyDataMap.get(dateStr)!;
    dayData.sales += Number(tx.amount);
    dayData.profit += Number(tx.profit);
    dayData.volume += 1;

    // Service Map
    // @ts-ignore
    const serviceName = tx.services?.name || 'Unknown';
    servicePopularityMap.set(serviceName, (servicePopularityMap.get(serviceName) || 0) + 1);
  });

  const chartData = Array.from(dailyDataMap.values());
  const serviceData = Array.from(servicePopularityMap.entries()).map(([name, value]) => ({ name, value }));

  // Kyanda Data
  let kyandaBalance = 0;
  let kyandaEarnings = 0;
  let kyandaStatus = 'Unknown';
  try {
    const provider = new KyandaProvider();
    const kyandaRes = await provider.checkAccountBalance();
    kyandaBalance = kyandaRes.Account_Bal;
    kyandaEarnings = kyandaRes.Earnings_Bal;
    kyandaStatus = 'Connected';
  } catch (error) {
    console.error('Failed to fetch Kyanda balance:', error);
    kyandaStatus = 'Disconnected';
  }

  return (
    <DashboardClient 
      summary={{
        todaySales,
        todayProfit,
        totalTransactions: totalTransactions || 0,
        successfulCount,
        failedCount,
        pendingCount,
        kyandaBalance,
        kyandaEarnings,
        kyandaStatus
      }}
      chartData={chartData}
      serviceData={serviceData}
    />
  );
}
