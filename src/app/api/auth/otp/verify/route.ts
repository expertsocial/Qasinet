import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetOTP } from '@/lib/auth/otp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Email and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyPasswordResetOTP(email, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Verification failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      resetToken: result.resetToken,
    });
  } catch (error: unknown) {
    console.error('[OTP Verify Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification.' },
      { status: 500 }
    );
  }
}
