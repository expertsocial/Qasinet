import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const statusFilter = searchParams.get('status')?.toUpperCase() || 'ALL';
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const offset = (page - 1) * limit;

    // Fetch user profile for phone matching
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    const userPhone = profile?.phone || user.phone || '';

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
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Scope to user
    if (userPhone) {
      query = query.or(`user_id.eq.${user.id},guest_phone.eq.${userPhone},destination.eq.${userPhone}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    // Status filter
    if (statusFilter === 'SUCCESS') {
      query = query.eq('status', 'SUCCESS');
    } else if (statusFilter === 'FAILED') {
      query = query.in('status', ['FAILED', 'PAYMENT_FAILED', 'VENDING_FAILED']);
    } else if (statusFilter === 'PENDING') {
      query = query.not('status', 'in', '("SUCCESS","FAILED","PAYMENT_FAILED","VENDING_FAILED")');
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, count, error: txError } = await query;

    if (txError) {
      console.error('[User Transactions API] Error fetching transactions:', txError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    let filtered = (transactions || []).map((tx: any) => ({
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

    // Client-side text search refinement if search param provided
    if (search) {
      filtered = filtered.filter((t: any) =>
        t.reference?.toLowerCase().includes(search) ||
        t.paymentReference?.toLowerCase().includes(search) ||
        t.destination?.toLowerCase().includes(search) ||
        t.serviceName?.toLowerCase().includes(search) ||
        t.productName?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      transactions: filtered,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('[User Transactions API] Unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
