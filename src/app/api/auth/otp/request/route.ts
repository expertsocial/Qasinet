import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordResetOTP } from '@/lib/auth/otp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
    const result = await requestPasswordResetOTP(email, ip);

    if (result.rateLimited) {
      return NextResponse.json(
        { error: result.message, retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error('[OTP Request Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
