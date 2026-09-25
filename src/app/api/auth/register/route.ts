import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-check';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, email, password } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter your full name.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim().replace(/\D/g, '');

    // Prevent public customer registration using reserved admin domain/emails
    if (isAuthorizedAdminEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'This email address is reserved. Please sign in or contact administration.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Authentication service configuration error.' },
        { status: 500 }
      );
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if user with this email already exists in profiles
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Check if phone already exists if phone provided
    if (cleanPhone && cleanPhone.length >= 9) {
      const { data: existingPhone } = await adminClient
        .from('profiles')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone.slice(-9)},phone.eq.254${cleanPhone.slice(-9)}`)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please sign in instead.' },
          { status: 400 }
        );
      }
    }

    // Create user via Admin API with email_confirm: true (no OTP, no verification email needed)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: cleanPhone || phone || '',
      },
    });

    if (createError || !userData.user) {
      console.error('[Register API] createUser error:', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create account. Please try again.' },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    // Create / upsert profile in profiles table
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName.trim(),
        phone: cleanPhone || phone || '',
        email: cleanEmail,
      });

    if (profileError) {
      console.error('[Register API] profile upsert error:', profileError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        fullName: fullName.trim(),
      },
    });
  } catch (err: unknown) {
    console.error('[Register API Exception]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating your account.' },
      { status: 500 }
    );
  }
}
