import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminProfile, updateAdminProfile, verifyAdminPrivileges } from '@/lib/auth/admin-account';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged = await verifyAdminPrivileges(user.id);
    if (!isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: Administrator privileges required' }, { status: 403 });
    }

    const profile = await getAdminProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('[Admin Profile GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged = await verifyAdminPrivileges(user.id);
    if (!isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: Administrator privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { phone, fullName } = body;

    const result = await updateAdminProfile({
      adminId: user.id,
      phone,
      fullName,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update profile' }, { status: 400 });
    }

    await logAdminAction({
      action: 'UPDATE_ADMIN_PROFILE',
      targetTable: 'profiles',
      targetId: user.id,
      details: { phone, fullName },
    });

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('[Admin Profile PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
