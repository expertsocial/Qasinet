import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userPhone = profile?.phone || user.phone || '';

    // 2. Fetch all transactions for this user
    let query = supabase
      .from('transactions')
      .select(`
        id,
        qsn_reference,
        user_id,
        guest_phone,
        destination,
        amount,
        selling_price,
        status,
        failure_reason,
        payment_reference,
        kyanda_reference,
        created_at,
        updated_at,
        services (
          id,
          name,
          slug,
          type
        ),
        products (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (userPhone) {
      query = query.or(`user_id.eq.${user.id},guest_phone.eq.${userPhone},destination.eq.${userPhone}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('[User Dashboard API] Error fetching transactions:', txError);
      return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }

    const allTx = transactions || [];

    // 3. Compute Metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalSpent = 0;
    let thisMonthSpent = 0;
    let lastMonthSpent = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    const uniqueServices = new Set<string>();

    allTx.forEach((tx: any) => {
      const price = Number(tx.selling_price || tx.amount || 0);
      const isSuccess = tx.status === 'SUCCESS';
      const isFailed = tx.status === 'FAILED' || tx.status === 'PAYMENT_FAILED' || tx.status === 'VENDING_FAILED';
      const isPending = !isSuccess && !isFailed;

      if (isSuccess) {
        successfulCount++;
        totalSpent += price;

        const txDate = new Date(tx.created_at);
        if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
          thisMonthSpent += price;
        } else if (
          (currentMonth === 0 && txDate.getFullYear() === currentYear - 1 && txDate.getMonth() === 11) ||
          (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth - 1)
        ) {
          lastMonthSpent += price;
        }

        if (tx.services?.name) {
          uniqueServices.add(tx.services.name);
        }
      } else if (isFailed) {
        failedCount++;
      } else if (isPending) {
        pendingCount++;
      }
    });

    const totalCount = allTx.length;
    const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 100;

    // 4. Format Recent Transactions (Top 10)
    const formattedRecent = allTx.slice(0, 10).map((tx: any) => ({
      id: tx.id,
      reference: tx.qsn_reference,
      serviceName: tx.services?.name || 'Utility Service',
      serviceSlug: tx.services?.slug || '',
      serviceType: tx.services?.type || 'utility',
      productName: tx.products?.name || null,
      destination: tx.destination,
      amount: Number(tx.selling_price || tx.amount || 0),
      status: tx.status,
      failureReason: tx.failure_reason,
      paymentReference: tx.payment_reference,
      date: tx.created_at
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || 'Valued Member',
        email: profile?.email || user.email || '',
        phone: userPhone
      },
      metrics: {
        totalSpent,
        thisMonthSpent,
        lastMonthSpent,
        totalTransactions: totalCount,
        successfulTransactions: successfulCount,
        failedTransactions: failedCount,
        pendingTransactions: pendingCount,
        successRate,
        activeServicesCount: uniqueServices.size
      },
      recentTransactions: formattedRecent
    });
  } catch (error: any) {
    console.error('[User Dashboard API] Unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
