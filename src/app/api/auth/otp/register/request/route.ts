import { NextRequest, NextResponse } from 'next/server';
import { requestRegistrationOTP } from '@/lib/auth/otp';
import { maskEmail } from '@/lib/email/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
    const result = await requestRegistrationOTP(email, ip);

    if (result.rateLimited) {
      return NextResponse.json(
        { error: result.message, retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to dispatch verification code.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: maskEmail(email),
      message: result.message,
    });
  } catch (error: unknown) {
    console.error('[Registration OTP Request Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending verification code.' },
      { status: 500 }
    );
  }
}
