import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAdminPassword, verifyAdminPrivileges } from '@/lib/auth/admin-account';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged = await verifyAdminPrivileges(user.id);
    if (!isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: Administrator privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    // Retrieve session token to revoke other active devices
    const { data: { session } } = await supabase.auth.getSession();
    const currentJwt = session?.access_token;

    const result = await updateAdminPassword({
      adminId: user.id,
      email: user.email,
      currentPassword,
      newPassword,
      currentJwt,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update password' }, { status: 400 });
    }

    await logAdminAction({
      action: 'UPDATE_ADMIN_PASSWORD',
      targetTable: 'auth.users',
      targetId: user.id,
      details: {
        revokedOtherSessions: !!currentJwt,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Other active sessions have been revoked.',
    });
  } catch (error: any) {
    console.error('[Admin Password POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
