import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminEmailChangeOTP, verifyAdminPrivileges } from '@/lib/auth/admin-account';
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
    const { newEmail, code } = body;

    if (!newEmail || !code) {
      return NextResponse.json(
        { error: 'New email address and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const previousEmail = user.email;

    const result = await verifyAdminEmailChangeOTP({
      adminId: user.id,
      newEmail,
      code,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Verification failed.' }, { status: 400 });
    }

    await logAdminAction({
      action: 'UPDATE_ADMIN_EMAIL',
      targetTable: 'auth.users',
      targetId: user.id,
      details: {
        previousEmail,
        newEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin email updated successfully. Please use your new email for subsequent logins.',
    });
  } catch (error: any) {
    console.error('[Admin Verify Email OTP Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
