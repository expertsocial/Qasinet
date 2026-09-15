import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requestAdminEmailChangeOTP, verifyAdminPrivileges } from '@/lib/auth/admin-account';

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
    const { newEmail, currentPassword } = body;

    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { error: 'Both new email address and current password are required.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';

    const result = await requestAdminEmailChangeOTP({
      adminId: user.id,
      currentEmail: user.email,
      newEmail,
      currentPassword,
      ip,
    });

    if (!result.success) {
      if (result.rateLimited) {
        return NextResponse.json(
          { error: result.error, retryAfterSeconds: result.retryAfterSeconds },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: result.error || 'Failed to request verification code' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'A 6-digit verification code has been sent to the new email address.',
    });
  } catch (error: any) {
    console.error('[Admin Request Email OTP Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
