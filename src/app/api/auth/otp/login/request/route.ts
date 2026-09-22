import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requestLoginOTP } from '@/lib/auth/otp';
import { maskEmail } from '@/lib/email/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, email, password } = body;

    const rawIdentifier = (email || identifier || '').trim();
    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Auth service configuration error.' },
        { status: 500 }
      );
    }

    let resolvedEmail = rawIdentifier.toLowerCase();

    // If identifier is not an email, lookup user's registered email in profiles
    if (!resolvedEmail.includes('@')) {
      const cleanDigits = resolvedEmail.replace(/\D/g, '');
      const adminClient = createSupabaseClient(supabaseUrl, serviceKey || anonKey, {
        auth: { persistSession: false },
      });

      const { data: profile } = await adminClient
        .from('profiles')
        .select('email')
        .or(`phone.eq.${cleanDigits},phone.eq.0${cleanDigits.slice(-9)},phone.eq.254${cleanDigits.slice(-9)}`)
        .maybeSingle();

      if (profile?.email) {
        resolvedEmail = profile.email.toLowerCase().trim();
      } else {
        return NextResponse.json(
          { error: 'No account found with this identifier. Please enter your email.' },
          { status: 400 }
        );
      }
    }

    // Verify credentials first before sending login OTP
    const authClient = createSupabaseClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email and password.' },
        { status: 400 }
      );
    }

    // Dispatch 6-digit Login OTP strictly to EMAIL ONLY
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
    const otpResult = await requestLoginOTP(resolvedEmail, ip);

    if (otpResult.rateLimited) {
      return NextResponse.json(
        { error: otpResult.message, retryAfterSeconds: otpResult.retryAfterSeconds },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      email: maskEmail(resolvedEmail),
      rawEmail: resolvedEmail,
      message: otpResult.message,
    });
  } catch (error: unknown) {
    console.error('[Login OTP Request Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while initiating sign-in.' },
      { status: 500 }
    );
  }
}
