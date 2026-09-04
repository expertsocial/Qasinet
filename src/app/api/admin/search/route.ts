import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search transactions by reference, phone, or token
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        qsn_reference,
        amount,
        selling_price,
        status,
        created_at,
        metadata,
        services (name),
        profiles (full_name, phone, email)
      `)
      .or(`qsn_reference.ilike.%${query}%,id.eq.${query.length === 36 ? query : '00000000-0000-0000-0000-000000000000'}`)
      .order('created_at', { ascending: false })
      .limit(8);

    // Also search by phone if it looks like numbers
    let phoneMatches: any[] = [];
    if (/^\d+$/.test(query.replace(/\D/g, '')) && query.length >= 4) {
      const cleanPhone = query.replace(/\D/g, '');
      const { data: txsByPhone } = await supabase
        .from('transactions')
        .select(`
          id,
          qsn_reference,
          amount,
          selling_price,
          status,
          created_at,
          metadata,
          services (name),
          profiles (full_name, phone, email)
        `)
        .order('created_at', { ascending: false })
        .limit(8);

      // Filter in memory for metadata phone or account
      phoneMatches = (txsByPhone || []).filter((tx: any) => {
        const phone = tx.metadata?.phone || tx.metadata?.recipient_phone || tx.metadata?.account_number || tx.profiles?.phone;
        return phone && phone.includes(cleanPhone);
      });
    }

    // Merge and deduplicate
    const combined = [...(transactions || []), ...phoneMatches];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values()).slice(0, 10);

    const formatted = unique.map((tx: any) => ({
      id: tx.id,
      reference: tx.qsn_reference || tx.id.substring(0, 8),
      service: tx.services?.name || tx.metadata?.service_type || 'Utility',
      amount: tx.selling_price || tx.amount || 0,
      recipient: tx.metadata?.phone || tx.metadata?.recipient_phone || tx.metadata?.account_number || tx.profiles?.phone || 'N/A',
      status: tx.status,
      token: tx.metadata?.token || tx.metadata?.voucher_code || null,
      date: tx.created_at
    }));

    return NextResponse.json({ results: formatted });
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
