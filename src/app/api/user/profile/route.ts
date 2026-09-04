import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || user.phone || '',
        notificationsEmail: user.user_metadata?.notifications_email ?? true,
        notificationsSMS: user.user_metadata?.notifications_sms ?? false,
        createdAt: profile?.created_at || user.created_at
      }
    });
  } catch (error: any) {
    console.error('[User Profile API] GET error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, email, notificationsEmail, notificationsSMS } = body;

    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName?.trim() || user.user_metadata?.full_name,
        email: email?.trim() || user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[User Profile API] Profile table update error:', profileError);
    }

    // 2. Update auth user metadata
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName?.trim(),
        notifications_email: notificationsEmail,
        notifications_sms: notificationsSMS
      }
    });

    if (metaError) {
      console.error('[User Profile API] Metadata update error:', metaError);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('[User Profile API] POST error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
