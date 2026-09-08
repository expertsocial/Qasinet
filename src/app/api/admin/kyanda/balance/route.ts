import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { floatService } from '@/lib/services/float';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify Admin rights
    const isAdmin = 
      user.app_metadata?.role === 'ADMIN' ||
      user.app_metadata?.is_admin === true ||
      user.email === 'sanaregeorge08@gmail.com';

    if (!isAdmin) {
      const { data: adminCheck } = await supabaseService.from('admins').select('id').eq('id', user.id).single();
      if (!adminCheck) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Call floatService.refreshBalance() which makes a live network call to Kyanda
    // AND refreshes the shared in-memory cache so subsequent customer checkouts immediately benefit.
    const balance = await floatService.refreshBalance();
    const config = floatService.getConfig();

    return NextResponse.json({
      success: true,
      accountBalance: balance.accountBalance,
      earningsBalance: balance.earningsBalance,
      timestamp: balance.timestamp,
      cacheRefreshed: true,
      config,
    });
  } catch (error: any) {
    console.error('[Admin Balance API Error]:', error?.message || error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch live balance from Kyanda',
    }, { status: 500 });
  }
}
