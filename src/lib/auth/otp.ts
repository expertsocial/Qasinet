import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendEmail, maskEmail } from '@/lib/email/client';

// Rate limit parameters
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

interface StoredOTP {
  email: string;
  userId?: string;
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

interface StoredResetSession {
  email: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}

// In-memory store backed by Supabase system_settings for serverless survivability
const memoryOtpMap = new Map<string, StoredOTP>();
const memoryLoginOtpMap = new Map<string, StoredOTP>();
const memoryRegOtpMap = new Map<string, StoredOTP>();
const memoryRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const memoryResetSessionMap = new Map<string, StoredResetSession>();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a SHA-256 hash of the salt + OTP code.
 */
export function hashOTP(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

/**
 * Hashes a sensitive token (such as a password reset token).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Checks and increments the request rate limit for an identifier (email or IP).
 * Max 3 requests per 15 minutes.
 */
export function checkRequestRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const entry = memoryRateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryRateLimitMap.set(key, { count: 1, resetAt: now + OTP_REQUEST_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_OTP_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Stores an OTP directly in memory (for testing and controlled flows).
 */
export function storeOTPForTesting(email: string, code: string, expiresAt?: number): void {
  const normalizedEmail = email.toLowerCase().trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashOTP(code, salt);
  const now = Date.now();
  const entry: StoredOTP = {
    email: normalizedEmail,
    userId: 'mock-test-user-id',
    hash,
    salt,
    expiresAt: expiresAt ?? (now + OTP_EXPIRY_MS),
    attempts: 0,
    createdAt: now,
  };
  const storeKey = `otp:${normalizedEmail}`;
  memoryOtpMap.set(storeKey, entry);
}

/**
 * Clears rate limits (primarily used in testing).
 */
export function clearRateLimitsForTesting(): void {
  memoryRateLimitMap.clear();
  memoryOtpMap.clear();
  memoryResetSessionMap.clear();
  memoryLoginOtpMap.clear();
  memoryRegOtpMap.clear();
}

/**
 * Helper to persist state in Supabase system_settings so multi-instance
 * or cold-start serverless environments can share OTPs and tokens safely.
 */
async function saveToSystemSettings(key: string, value: unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    await supabase.from('system_settings').upsert({
      key,
      value,
      description: 'Temporary Auth OTP/Session Token',
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[OTP Store Warning] Could not persist key ${key} to system_settings:`, err);
  }
}

async function loadFromSystemSettings<T>(key: string): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return (data?.value as T) || null;
  } catch {
    return null;
  }
}

async function deleteFromSystemSettings(key: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    await supabase.from('system_settings').delete().eq('key', key);
  } catch {
    // ignore
  }
}

/**
 * Generates and sends a 6-digit password reset OTP.
 * Defends against account enumeration by always taking comparable time
 * and returning identical messages whether the email exists or not.
 */
export async function requestPasswordResetOTP(
  email: string,
  ip: string
): Promise<{ success: boolean; message: string; rateLimited?: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const uniformMessage = "If an account with that email exists, we've sent a 6-digit verification code.";

  // 1. Rate limit by IP
  const ipCheck = checkRequestRateLimit(`ip:${ip}`);
  if (!ipCheck.allowed) {
    return {
      success: false,
      message: `Too many requests from this device. Please try again in ${Math.ceil((ipCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    };
  }

  // 2. Rate limit by Email
  const emailCheck = checkRequestRateLimit(`email:${normalizedEmail}`);
  if (!emailCheck.allowed) {
    return {
      success: false,
      message: `Too many code requests for this email. Please try again in ${Math.ceil((emailCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: emailCheck.retryAfterSeconds,
    };
  }

  // 3. Look up user account in Supabase (timing-safe defense)
  const supabase = getSupabaseAdmin();
  let userRecord: { id: string; email: string } | null = null;

  if (supabase) {
    try {
      // 3a. Fast indexed lookup on profiles table with 4s timeout guard
      const profilePromise = supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 4000));
      const res = (await Promise.race([profilePromise, timeoutPromise])) as {
        data?: { id?: string; email?: string } | null;
      } | null;
      const profileData = res?.data;

      if (profileData?.id) {
        userRecord = { id: profileData.id, email: profileData.email || normalizedEmail };
      }
    } catch (err) {
      console.error('[OTP Account Lookup Error]:', err);
    }
  }

  // If user does NOT exist, simulate work and return uniform response without revealing existence
  if (!userRecord) {
    // Perform simulated dummy hash and brief sleep to normalize execution duration
    const dummySalt = crypto.randomBytes(16).toString('hex');
    hashOTP('000000', dummySalt);
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(`[OTP Enumeration Defense] Email not found: ${maskEmail(normalizedEmail)}. Uniform response returned.`);
    return { success: true, message: uniformMessage };
  }

  // 4. Generate 6-digit OTP and cryptographically secure salt
  const otpCode = generateNumericOTP();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedCode = hashOTP(otpCode, salt);
  const now = Date.now();

  const otpEntry: StoredOTP = {
    email: normalizedEmail,
    userId: userRecord.id,
    hash: hashedCode,
    salt,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    createdAt: now,
  };

  // 5. Store OTP (In-memory + system_settings)
  const storeKey = `otp:${normalizedEmail}`;
  memoryOtpMap.set(storeKey, otpEntry);
  await saveToSystemSettings(storeKey, otpEntry);

  // 6. Send email with minimal, security-focused formatting
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; text-align: center;">
      Qasi<span style="color: #10b981;">Net</span> Password Reset
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.5;">
      You requested a verification code to reset your QasiNet account password.
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px;">
        Verification Code
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399;">
        ${otpCode}
      </div>
    </div>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
      • This code is valid for <strong>10 minutes</strong>.
    </p>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
      • If you did not request this code, you can safely ignore this email. Your password will remain unchanged.
    </p>
    <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Security Service • automated message, please do not reply.
    </div>
  </div>
</body>
</html>
  `.trim();

  // Send fire-and-forget through resilient email client
  const sendRes = await sendEmail({
    to: normalizedEmail,
    subject: `Your QasiNet verification code: ${otpCode}`,
    html: emailHtml,
    text: `Your QasiNet verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  });

  if (!sendRes.success) {
    console.warn(`[OTP Send Warning] Email send to ${maskEmail(normalizedEmail)} returned error: ${sendRes.error}`);
  }

  return { success: true, message: uniformMessage };
}

/**
 * Verifies the 6-digit OTP.
 * Enforces max 5 verification attempts per code before invalidating it.
 * Upon successful verification, invalidates the code immediately and issues
 * a 15-minute single-use reset session token.
 */
export async function verifyPasswordResetOTP(
  email: string,
  code: string
): Promise<{ success: boolean; resetToken?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = (code || '').replace(/\D/g, '').trim();
  const storeKey = `otp:${normalizedEmail}`;

  // Load from memory or system_settings
  let otpEntry = memoryOtpMap.get(storeKey);
  if (!otpEntry) {
    otpEntry = (await loadFromSystemSettings<StoredOTP>(storeKey)) || undefined;
  }

  if (!otpEntry) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  const now = Date.now();

  // Check expiration
  if (otpEntry.expiresAt <= now) {
    memoryOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }

  // Check attempt limit
  if (otpEntry.attempts >= MAX_VERIFY_ATTEMPTS) {
    memoryOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return {
      success: false,
      error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
    };
  }

  // Compute hash and compare using timingSafeEqual
  const candidateHash = hashOTP(cleanCode, otpEntry.salt);
  const isMatch =
    candidateHash.length === otpEntry.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(otpEntry.hash));

  if (!isMatch) {
    otpEntry.attempts++;
    memoryOtpMap.set(storeKey, otpEntry);
    await saveToSystemSettings(storeKey, otpEntry);

    const remaining = MAX_VERIFY_ATTEMPTS - otpEntry.attempts;
    if (remaining <= 0) {
      memoryOtpMap.delete(storeKey);
      await deleteFromSystemSettings(storeKey);
      return {
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
      };
    }
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Successful verification: Invalidate OTP immediately (single use)
  memoryOtpMap.delete(storeKey);
  await deleteFromSystemSettings(storeKey);

  // Issue single-use reset token session
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawResetToken);
  const sessionKey = `reset_session:${tokenHash}`;

  const resetSession: StoredResetSession = {
    email: normalizedEmail,
    userId: otpEntry.userId || '',
    expiresAt: now + RESET_TOKEN_EXPIRY_MS,
    createdAt: now,
  };

  memoryResetSessionMap.set(sessionKey, resetSession);
  await saveToSystemSettings(sessionKey, resetSession);

  console.log(`[OTP Verified] Successful verification for ${maskEmail(normalizedEmail)}. Issued reset session.`);
  return { success: true, resetToken: rawResetToken };
}

/**
 * Validates the reset session token and updates the user's password.
 * Invalidator consumes the token immediately so it cannot be reused.
 */
export async function confirmPasswordResetWithToken(
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!resetToken || typeof resetToken !== 'string') {
    return { success: false, error: 'Invalid password reset token.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const tokenHash = hashToken(resetToken);
  const sessionKey = `reset_session:${tokenHash}`;

  let session = memoryResetSessionMap.get(sessionKey);
  if (!session) {
    session = (await loadFromSystemSettings<StoredResetSession>(sessionKey)) || undefined;
  }

  if (!session) {
    return { success: false, error: 'Invalid or expired password reset session. Please request a new code.' };
  }

  const now = Date.now();
  if (session.expiresAt <= now) {
    memoryResetSessionMap.delete(sessionKey);
    await deleteFromSystemSettings(sessionKey);
    return { success: false, error: 'Password reset session has expired. Please request a new code.' };
  }

  // Invalidate session immediately before updating
  memoryResetSessionMap.delete(sessionKey);
  await deleteFromSystemSettings(sessionKey);

  // Update password in Supabase via Admin API
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Auth service configuration error.' };
  }

  try {
    let userId = session.userId;

    if (!userId) {
      // Look up user ID by email if not present in session
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === session!.email.toLowerCase()
      );
      if (user?.id) {
        userId = user.id;
      }
    }

    if (!userId) {
      return { success: false, error: 'Could not resolve user account for password update.' };
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error('[Password Update Error]:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`[Password Reset Success] Password successfully updated for ${maskEmail(session.email)}.`);
    return { success: true };
  } catch (err: unknown) {
    console.error('[Password Reset Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update password.',
    };
  }
}

/**
 * Stores a Login OTP directly in memory (for testing and controlled flows).
 */
export function storeLoginOTPForTesting(email: string, code: string, expiresAt?: number): void {
  const normalizedEmail = email.toLowerCase().trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashOTP(code, salt);
  const now = Date.now();
  const entry: StoredOTP = {
    email: normalizedEmail,
    userId: 'mock-test-user-id',
    hash,
    salt,
    expiresAt: expiresAt ?? (now + OTP_EXPIRY_MS),
    attempts: 0,
    createdAt: now,
  };
  const storeKey = `login_otp:${normalizedEmail}`;
  memoryLoginOtpMap.set(storeKey, entry);
}

/**
 * Stores a Registration OTP directly in memory (for testing).
 */
export function storeRegistrationOTPForTesting(email: string, code: string, expiresAt?: number): void {
  const normalizedEmail = email.toLowerCase().trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashOTP(code, salt);
  const now = Date.now();
  const entry: StoredOTP = {
    email: normalizedEmail,
    userId: 'mock-test-user-id',
    hash,
    salt,
    expiresAt: expiresAt ?? (now + OTP_EXPIRY_MS),
    attempts: 0,
    createdAt: now,
  };
  const storeKey = `reg_otp:${normalizedEmail}`;
  memoryRegOtpMap.set(storeKey, entry);
}

/**
 * Generates and sends a 6-digit Login OTP to the user's EMAIL ONLY.
 * OTP must be verified in order to access any account.
 */
export async function requestLoginOTP(
  email: string,
  ip: string
): Promise<{ success: boolean; message: string; rateLimited?: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Rate limit by IP
  const ipCheck = checkRequestRateLimit(`ip:login:${ip}`);
  if (!ipCheck.allowed) {
    return {
      success: false,
      message: `Too many login attempts from this device. Please try again in ${Math.ceil((ipCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    };
  }

  // 2. Rate limit by Email
  const emailCheck = checkRequestRateLimit(`email:login:${normalizedEmail}`);
  if (!emailCheck.allowed) {
    return {
      success: false,
      message: `Too many login code requests for this email. Please try again in ${Math.ceil((emailCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: emailCheck.retryAfterSeconds,
    };
  }

  // 3. Generate 6-digit OTP and salt
  const otpCode = generateNumericOTP();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedCode = hashOTP(otpCode, salt);
  const now = Date.now();

  const otpEntry: StoredOTP = {
    email: normalizedEmail,
    hash: hashedCode,
    salt,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    createdAt: now,
  };

  // 4. Store OTP in memory and system_settings
  const storeKey = `login_otp:${normalizedEmail}`;
  memoryLoginOtpMap.set(storeKey, otpEntry);
  await saveToSystemSettings(storeKey, otpEntry);

  // 5. Send login OTP to EMAIL ONLY
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Sign-In Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; text-align: center;">
      Qasi<span style="color: #10b981;">Net</span> Sign-In Verification
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.5;">
      A sign-in attempt was initiated for your QasiNet account. To complete sign-in, enter the 6-digit verification code below:
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px;">
        Sign-In Code
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399;">
        ${otpCode}
      </div>
    </div>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
      • This code is valid for <strong>10 minutes</strong>.
    </p>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
      • OTP codes are delivered <strong>strictly to your email</strong>. Never share this code with anyone.
    </p>
    <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Security Service • automated message, please do not reply.
    </div>
  </div>
</body>
</html>
  `.trim();

  const sendRes = await sendEmail({
    to: normalizedEmail,
    subject: `Your QasiNet Login Verification Code: ${otpCode}`,
    html: emailHtml,
    text: `Your QasiNet sign-in verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nOTPs are sent strictly to your email. If you did not initiate this request, please secure your account.`,
  });

  if (!sendRes.success) {
    console.warn(`[Login OTP Send Warning] Email send to ${maskEmail(normalizedEmail)} returned error: ${sendRes.error}`);
  }

  return { success: true, message: `Verification code sent to ${maskEmail(normalizedEmail)}.` };
}

/**
 * Verifies the 6-digit Login OTP.
 */
export async function verifyLoginOTP(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = (code || '').replace(/\D/g, '').trim();
  const storeKey = `login_otp:${normalizedEmail}`;

  let otpEntry = memoryLoginOtpMap.get(storeKey);
  if (!otpEntry) {
    otpEntry = (await loadFromSystemSettings<StoredOTP>(storeKey)) || undefined;
  }

  if (!otpEntry) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  const now = Date.now();

  if (otpEntry.expiresAt <= now) {
    memoryLoginOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }

  if (otpEntry.attempts >= MAX_VERIFY_ATTEMPTS) {
    memoryLoginOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return {
      success: false,
      error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
    };
  }

  const candidateHash = hashOTP(cleanCode, otpEntry.salt);
  const isMatch =
    candidateHash.length === otpEntry.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(otpEntry.hash));

  if (!isMatch) {
    otpEntry.attempts++;
    memoryLoginOtpMap.set(storeKey, otpEntry);
    await saveToSystemSettings(storeKey, otpEntry);

    const remaining = MAX_VERIFY_ATTEMPTS - otpEntry.attempts;
    if (remaining <= 0) {
      memoryLoginOtpMap.delete(storeKey);
      await deleteFromSystemSettings(storeKey);
      return {
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
      };
    }
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Delete upon successful verification (single-use)
  memoryLoginOtpMap.delete(storeKey);
  await deleteFromSystemSettings(storeKey);

  console.log(`[Login OTP Verified] Successful verification for ${maskEmail(normalizedEmail)}.`);
  return { success: true };
}

/**
 * Generates and sends a 6-digit Registration OTP to the user's EMAIL ONLY.
 */
export async function requestRegistrationOTP(
  email: string,
  ip: string
): Promise<{ success: boolean; message: string; rateLimited?: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit
  const ipCheck = checkRequestRateLimit(`ip:reg:${ip}`);
  if (!ipCheck.allowed) {
    return {
      success: false,
      message: `Too many registration attempts from this device. Please try again later.`,
      rateLimited: true,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    };
  }

  const emailCheck = checkRequestRateLimit(`email:reg:${normalizedEmail}`);
  if (!emailCheck.allowed) {
    return {
      success: false,
      message: `Too many requests for this email. Please try again later.`,
      rateLimited: true,
      retryAfterSeconds: emailCheck.retryAfterSeconds,
    };
  }

  const otpCode = generateNumericOTP();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedCode = hashOTP(otpCode, salt);
  const now = Date.now();

  const otpEntry: StoredOTP = {
    email: normalizedEmail,
    hash: hashedCode,
    salt,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    createdAt: now,
  };

  const storeKey = `reg_otp:${normalizedEmail}`;
  memoryRegOtpMap.set(storeKey, otpEntry);
  await saveToSystemSettings(storeKey, otpEntry);

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your QasiNet Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; text-align: center;">
      Welcome to Qasi<span style="color: #10b981;">Net</span>
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.5;">
      Thank you for creating an account with QasiNet. To complete your registration, enter the verification code below:
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px;">
        Account Verification Code
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399;">
        ${otpCode}
      </div>
    </div>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
      • Valid for <strong>10 minutes</strong>.
    </p>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
      • Verification codes are dispatched <strong>strictly to your email</strong>.
    </p>
    <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Security Service • automated message, please do not reply.
    </div>
  </div>
</body>
</html>
  `.trim();

  const sendRes = await sendEmail({
    to: normalizedEmail,
    subject: `Your QasiNet Account Verification Code: ${otpCode}`,
    html: emailHtml,
    text: `Your QasiNet account verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`,
  });

  if (!sendRes.success) {
    console.warn(`[Reg OTP Send Warning] Email send to ${maskEmail(normalizedEmail)} returned error: ${sendRes.error}`);
  }

  return { success: true, message: `Verification code sent to ${maskEmail(normalizedEmail)}.` };
}

/**
 * Verifies the 6-digit Registration OTP.
 */
export async function verifyRegistrationOTP(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = (code || '').replace(/\D/g, '').trim();
  const storeKey = `reg_otp:${normalizedEmail}`;

  let otpEntry = memoryRegOtpMap.get(storeKey);
  if (!otpEntry) {
    otpEntry = (await loadFromSystemSettings<StoredOTP>(storeKey)) || undefined;
  }

  if (!otpEntry) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  const now = Date.now();

  if (otpEntry.expiresAt <= now) {
    memoryRegOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }

  if (otpEntry.attempts >= MAX_VERIFY_ATTEMPTS) {
    memoryRegOtpMap.delete(storeKey);
    await deleteFromSystemSettings(storeKey);
    return {
      success: false,
      error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
    };
  }

  const candidateHash = hashOTP(cleanCode, otpEntry.salt);
  const isMatch =
    candidateHash.length === otpEntry.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(otpEntry.hash));

  if (!isMatch) {
    otpEntry.attempts++;
    memoryRegOtpMap.set(storeKey, otpEntry);
    await saveToSystemSettings(storeKey, otpEntry);

    const remaining = MAX_VERIFY_ATTEMPTS - otpEntry.attempts;
    if (remaining <= 0) {
      memoryRegOtpMap.delete(storeKey);
      await deleteFromSystemSettings(storeKey);
      return {
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
      };
    }
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Delete upon successful verification (single-use)
  memoryRegOtpMap.delete(storeKey);
  await deleteFromSystemSettings(storeKey);

  console.log(`[Reg OTP Verified] Successful verification for ${maskEmail(normalizedEmail)}.`);
  return { success: true };
}
