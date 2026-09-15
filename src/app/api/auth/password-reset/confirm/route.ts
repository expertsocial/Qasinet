import { NextRequest, NextResponse } from 'next/server';
import { confirmPasswordResetWithToken } from '@/lib/auth/otp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resetToken, newPassword } = body;

    if (!resetToken || typeof resetToken !== 'string') {
      return NextResponse.json(
        { error: 'Valid password reset token is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const result = await confirmPasswordResetWithToken(resetToken, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.',
    });
  } catch (error: unknown) {
    console.error('[Password Reset Confirm Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    );
  }
}
