import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendEmail, maskEmail } from '@/lib/email/client';

// Security parameters for admin account management
const MAX_ADMIN_OTP_REQUESTS_PER_WINDOW = 3;
const ADMIN_OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ADMIN_VERIFY_ATTEMPTS = 5;
const ADMIN_OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface StoredAdminEmailChangeOTP {
  adminId: string;
  currentEmail: string;
  newEmail: string;
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

// In-memory caching layer backed by Supabase system_settings for serverless reliability
const memoryAdminOtpMap = new Map<string, StoredAdminEmailChangeOTP>();
const memoryAdminRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Supabase admin configuration missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createSupabaseClient(url, key);
}

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    throw new Error('Supabase public configuration missing (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateAdminNumericOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a SHA-256 hash of salt + OTP code.
 */
export function hashAdminOTP(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

/**
 * Rate limit check for admin OTP requests (max 3 per 15 min).
 */
export function checkAdminRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const normalizedKey = key.toLowerCase().trim();
  const now = Date.now();
  const entry = memoryAdminRateLimitMap.get(normalizedKey);

  if (!entry || entry.resetAt <= now) {
    memoryAdminRateLimitMap.set(normalizedKey, { count: 1, resetAt: now + ADMIN_OTP_REQUEST_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ADMIN_OTP_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Clear in-memory state (useful for automated testing).
 */
export function clearAdminStateForTesting(): void {
  memoryAdminOtpMap.clear();
  memoryAdminRateLimitMap.clear();
}

async function saveAdminOtpToDb(key: string, value: StoredAdminEmailChangeOTP): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from('system_settings').upsert({
      key,
      value,
      description: 'Temporary Admin Email Change OTP',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn(`[Admin OTP Warning] Could not persist key ${key} to system_settings:`, err);
  }
}

async function loadAdminOtpFromDb(key: string): Promise<StoredAdminEmailChangeOTP | null> {
  const supabase = getSupabaseAdmin();
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return (data?.value as StoredAdminEmailChangeOTP) || null;
  } catch {
    return null;
  }
}

async function deleteAdminOtpFromDb(key: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from('system_settings').delete().eq('key', key);
  } catch (err) {
    console.warn(`[Admin OTP Warning] Could not delete key ${key} from system_settings:`, err);
  }
}

/**
 * Validates whether a given user holds active administrator privileges.
 */
export async function verifyAdminPrivileges(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // 1. Check admins table
  const { data: adminRecord } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (adminRecord) return true;

  // 2. Check auth.users app_metadata / user_metadata
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  if (userData?.user) {
    const appMeta = userData.user.app_metadata || {};
    const userMeta = userData.user.user_metadata || {};
    if (appMeta.role === 'ADMIN' || appMeta.is_admin === true || userMeta.role === 'ADMIN') {
      return true;
    }
  }

  return false;
}

/**
 * Re-authenticates admin with current password.
 */
export async function verifyAdminPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!password) {
    return { success: false, error: 'Current password is required.' };
  }

  try {
    const authClient = getSupabaseAuthClient();
    const { error } = await authClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { success: false, error: 'Invalid current password. Authentication failed.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Admin Re-Auth Error]:', err);
    return { success: false, error: 'Failed to verify current password.' };
  }
}

/**
 * Validates password strength:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Requests an OTP to change the admin's email address.
 * Re-verifies current password before sending OTP.
 */
export async function requestAdminEmailChangeOTP({
  adminId,
  currentEmail,
  newEmail,
  currentPassword,
  ip,
}: {
  adminId: string;
  currentEmail: string;
  newEmail: string;
  currentPassword: string;
  ip: string;
}): Promise<{ success: boolean; error?: string; rateLimited?: boolean; retryAfterSeconds?: number }> {
  const normalizedNewEmail = newEmail.toLowerCase().trim();
  const normalizedCurrentEmail = currentEmail.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedNewEmail)) {
    return { success: false, error: 'Please enter a valid new email address.' };
  }

  if (normalizedNewEmail === normalizedCurrentEmail) {
    return { success: false, error: 'New email address must be different from the current email address.' };
  }

  // 1. Verify admin privilege
  const isPrivileged = await verifyAdminPrivileges(adminId);
  if (!isPrivileged) {
    return { success: false, error: 'Unauthorized: User is not an administrator.' };
  }

  // 2. Re-authenticate with current password
  const reAuth = await verifyAdminPassword(normalizedCurrentEmail, currentPassword);
  if (!reAuth.success) {
    return { success: false, error: reAuth.error || 'Current password verification failed.' };
  }

  // 3. Enforce rate limiting
  const ipCheck = checkAdminRateLimit(`admin-ip:${ip}`);
  if (!ipCheck.allowed) {
    return {
      success: false,
      error: `Too many email change requests from this device. Please try again in ${Math.ceil((ipCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    };
  }

  const adminCheck = checkAdminRateLimit(`admin-id:${adminId}`);
  if (!adminCheck.allowed) {
    return {
      success: false,
      error: `Too many email change requests for this account. Please try again in ${Math.ceil((adminCheck.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfterSeconds: adminCheck.retryAfterSeconds,
    };
  }

  // 4. Generate 6-digit numeric OTP and salt
  const otpCode = generateAdminNumericOTP();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedCode = hashAdminOTP(otpCode, salt);
  const now = Date.now();

  const otpEntry: StoredAdminEmailChangeOTP = {
    adminId,
    currentEmail: normalizedCurrentEmail,
    newEmail: normalizedNewEmail,
    hash: hashedCode,
    salt,
    expiresAt: now + ADMIN_OTP_EXPIRY_MS,
    attempts: 0,
    createdAt: now,
  };

  const storeKey = `admin_email_change_otp:${adminId}`;
  memoryAdminOtpMap.set(storeKey, otpEntry);
  await saveAdminOtpToDb(storeKey, otpEntry);

  // 5. Send OTP to new address via Resend
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Email Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; text-align: center;">
      Qasi<span style="color: #3b82f6;">Net</span> Admin Security
    </div>
    <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #c7d2fe;">
      <strong>Security Action:</strong> Verification requested to set this email as the administrator address for QasiNet.
    </div>
    <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.5;">
      Use the 6-digit verification code below to confirm ownership and finalize your administrator email change:
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px;">
        Admin Verification Code
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa;">
        ${otpCode}
      </div>
    </div>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
      • This code is valid for <strong>15 minutes</strong> and single-use only.
    </p>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
      • If you did not initiate this administrator email change, disregard this message.
    </p>
    <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Core Security • automated message, do not reply.
    </div>
  </div>
</body>
</html>
  `.trim();

  const sendRes = await sendEmail({
    to: normalizedNewEmail,
    subject: `QasiNet Admin Email Verification Code: ${otpCode}`,
    html: emailHtml,
    text: `Your QasiNet Administrator verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this change, please ignore this email.`,
  });

  if (!sendRes.success) {
    console.warn(`[Admin OTP Send Error] Delivery to ${maskEmail(normalizedNewEmail)} failed: ${sendRes.error}`);
    return {
      success: false,
      error: `Could not send verification email to ${maskEmail(normalizedNewEmail)}. ${sendRes.error || ''}`,
    };
  }

  return { success: true };
}

/**
 * Verifies the OTP, updates the admin email in Supabase auth and profiles,
 * cleans up temporary storage from system_settings, and triggers dual security notifications.
 */
export async function verifyAdminEmailChangeOTP({
  adminId,
  newEmail,
  code,
}: {
  adminId: string;
  newEmail: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  const normalizedNewEmail = newEmail.toLowerCase().trim();
  const cleanCode = (code || '').replace(/\D/g, '').trim();
  const storeKey = `admin_email_change_otp:${adminId}`;

  // 1. Fetch OTP entry from memory or system_settings
  let otpEntry = memoryAdminOtpMap.get(storeKey);
  if (!otpEntry) {
    otpEntry = (await loadAdminOtpFromDb(storeKey)) || undefined;
  }

  if (!otpEntry) {
    return { success: false, error: 'No active email change request found. Please request a new code.' };
  }

  // 2. Validate email matches request
  if (otpEntry.newEmail !== normalizedNewEmail) {
    return { success: false, error: 'Email address does not match the active verification request.' };
  }

  const now = Date.now();

  // 3. Expiration check with explicit DB cleanup
  if (otpEntry.expiresAt <= now) {
    memoryAdminOtpMap.delete(storeKey);
    await deleteAdminOtpFromDb(storeKey);
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // 4. Attempt limit check with explicit DB cleanup
  if (otpEntry.attempts >= MAX_ADMIN_VERIFY_ATTEMPTS) {
    memoryAdminOtpMap.delete(storeKey);
    await deleteAdminOtpFromDb(storeKey);
    return {
      success: false,
      error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
    };
  }

  // 5. Increment attempts counter
  otpEntry.attempts++;
  memoryAdminOtpMap.set(storeKey, otpEntry);
  await saveAdminOtpToDb(storeKey, otpEntry);

  // 6. Timing-safe constant-time hash comparison
  const candidateHash = hashAdminOTP(cleanCode, otpEntry.salt);
  const isMatch =
    candidateHash.length === otpEntry.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(otpEntry.hash));

  if (!isMatch) {
    const remaining = MAX_ADMIN_VERIFY_ATTEMPTS - otpEntry.attempts;
    if (remaining <= 0) {
      memoryAdminOtpMap.delete(storeKey);
      await deleteAdminOtpFromDb(storeKey);
      return {
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
      };
    }
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
    };
  }

  // 7. SUCCESS: Immediately purge OTP row from memory and system_settings
  memoryAdminOtpMap.delete(storeKey);
  await deleteAdminOtpFromDb(storeKey);

  const supabase = getSupabaseAdmin();

  // 8. Update Supabase auth.users
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(adminId, {
    email: normalizedNewEmail,
    email_confirm: true,
    app_metadata: {
      role: 'ADMIN',
      is_admin: true,
    },
  });

  if (authUpdateError) {
    console.error('[Admin Email Update Error]:', authUpdateError);
    return { success: false, error: `Failed to update auth email: ${authUpdateError.message}` };
  }

  // 9. Update profiles table
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      email: normalizedNewEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminId);

  if (profileUpdateError) {
    console.warn('[Admin Profile Update Warning]:', profileUpdateError);
  }

  // 10. Dual security notification:
  // (a) Security Alert to OLD email
  const oldEmailAlertHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Security Alert: Admin Email Changed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #ef4444; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ef4444; margin-bottom: 20px; text-align: center;">
      ⚠️ QasiNet Administrator Security Alert
    </div>
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5; margin-bottom: 16px;">
      The administrator email address for your QasiNet account was changed to:
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; text-align: center; font-weight: 600; font-size: 16px; color: #60a5fa; margin-bottom: 20px;">
      ${maskEmail(normalizedNewEmail)}
    </div>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
      If you authorized this change, you do not need to take any action. From now on, sign in using the new email address.
    </p>
    <div style="background-color: #450a0a; border: 1px solid #991b1b; border-radius: 8px; padding: 14px; font-size: 13px; color: #fca5a5;">
      <strong>Did not request this change?</strong> Your account credentials may have been compromised. Immediately contact technical support to lock access.
    </div>
    <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Security Operations • timestamp: ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>
  `.trim();

  // (b) Confirmation to NEW email
  const newEmailConfirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Admin Email Updated</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #10b981; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 20px; text-align: center;">
      ✓ Administrator Email Successfully Updated
    </div>
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
      This email address has been confirmed and is now active as the primary administrator account for QasiNet.
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; font-size: 14px; color: #94a3b8; margin-bottom: 20px;">
      • Primary Admin: <strong>${normalizedNewEmail}</strong><br/>
      • Updated: <strong>${new Date().toUTCString()}</strong>
    </div>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
      Please use this address for all future admin portal sign-ins.
    </p>
    <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Core Security • automated notification
    </div>
  </div>
</body>
</html>
  `.trim();

  // Dispatches (fire-and-forget safe)
  sendEmail({
    to: otpEntry.currentEmail,
    subject: '⚠️ QasiNet Security Alert: Administrator Email Changed',
    html: oldEmailAlertHtml,
    text: `Security Alert: Your QasiNet administrator email was changed to ${maskEmail(normalizedNewEmail)} on ${new Date().toISOString()}. If you did not authorize this, contact support immediately.`,
  }).catch((e) => console.warn('[Security Alert Send Error]:', e));

  sendEmail({
    to: normalizedNewEmail,
    subject: '✓ QasiNet Administrator Email Updated Successfully',
    html: newEmailConfirmHtml,
    text: `Your QasiNet administrator email address has been successfully updated to ${normalizedNewEmail}.`,
  }).catch((e) => console.warn('[Confirm Email Send Error]:', e));

  return { success: true };
}

/**
 * Updates the admin's password.
 * Requires current password verification, enforces complexity, updates auth.users,
 * and invalidates all other active sessions via signOut(jwt, 'others').
 */
export async function updateAdminPassword({
  adminId,
  email,
  currentPassword,
  newPassword,
  currentJwt,
}: {
  adminId: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  currentJwt?: string;
}): Promise<{ success: boolean; error?: string }> {
  // 1. Verify admin privilege
  const isPrivileged = await verifyAdminPrivileges(adminId);
  if (!isPrivileged) {
    return { success: false, error: 'Unauthorized: User is not an administrator.' };
  }

  // 2. Re-authenticate current credentials
  const reAuth = await verifyAdminPassword(email, currentPassword);
  if (!reAuth.success) {
    return { success: false, error: reAuth.error || 'Current password verification failed.' };
  }

  // 3. Prevent setting the same password
  if (currentPassword === newPassword) {
    return { success: false, error: 'New password must be different from your current password.' };
  }

  // 4. Validate password complexity
  const strengthCheck = validatePasswordStrength(newPassword);
  if (!strengthCheck.valid) {
    return { success: false, error: strengthCheck.errors.join(' ') };
  }

  const supabase = getSupabaseAdmin();

  // 5. Update user password in auth.users
  const { error: updateError } = await supabase.auth.admin.updateUserById(adminId, {
    password: newPassword,
  });

  if (updateError) {
    console.error('[Admin Password Update Error]:', updateError);
    return { success: false, error: `Failed to update password: ${updateError.message}` };
  }

  // 6. Invalidate other active sessions if current session JWT is provided
  if (currentJwt) {
    try {
      await supabase.auth.admin.signOut(currentJwt, 'others');
      console.log(`[Admin Security] Revoked other active sessions for admin ${adminId}`);
    } catch (revokeErr) {
      console.warn('[Admin Session Revocation Warning]:', revokeErr);
    }
  }

  // 7. Send notification email to admin
  const notificationHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Admin Password Changed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px;">
    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 20px; text-align: center;">
      Qasi<span style="color: #3b82f6;">Net</span> Admin Password Changed
    </div>
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
      Your QasiNet administrator password was successfully changed on <strong>${new Date().toUTCString()}</strong>.
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; font-size: 13px; color: #94a3b8; margin-bottom: 20px;">
      All other active sessions on other browsers and devices have been revoked for your security.
    </div>
    <p style="font-size: 13px; color: #94a3b8;">
      If you did not perform this change, please reset your password or contact security immediately.
    </p>
    <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
      QasiNet Security Service • automated message
    </div>
  </div>
</body>
</html>
  `.trim();

  sendEmail({
    to: email,
    subject: 'QasiNet Administrator Password Changed',
    html: notificationHtml,
    text: `Your QasiNet administrator password was successfully updated on ${new Date().toISOString()}. Other active sessions have been revoked.`,
  }).catch((e) => console.warn('[Password Change Email Error]:', e));

  return { success: true };
}

/**
 * Updates admin profile fields (phone number and full name).
 */
export async function updateAdminProfile({
  adminId,
  phone,
  fullName,
}: {
  adminId: string;
  phone?: string;
  fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  // 1. Verify admin privilege
  const isPrivileged = await verifyAdminPrivileges(adminId);
  if (!isPrivileged) {
    return { success: false, error: 'Unauthorized: User is not an administrator.' };
  }

  const supabase = getSupabaseAdmin();
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (phone !== undefined) {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    updatePayload.phone = cleanPhone;
  }

  if (fullName !== undefined) {
    updatePayload.full_name = fullName.trim();
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', adminId);

  if (error) {
    console.error('[Admin Profile Update Error]:', error);
    return { success: false, error: error.message };
  }

  // Also sync phone / full_name to auth.users user_metadata
  try {
    const metaUpdates: Record<string, any> = {};
    if (phone !== undefined) metaUpdates.phone = updatePayload.phone;
    if (fullName !== undefined) metaUpdates.full_name = updatePayload.full_name;

    await supabase.auth.admin.updateUserById(adminId, {
      user_metadata: metaUpdates,
    });
  } catch (syncErr) {
    console.warn('[Admin Auth Metadata Sync Warning]:', syncErr);
  }

  return { success: true };
}

/**
 * Retrieves the current admin profile data.
 */
export async function getAdminProfile(adminId: string): Promise<{
  id: string;
  email: string;
  phone: string;
  fullName: string;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, phone, full_name')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email || '',
    phone: profile.phone || '',
    fullName: profile.full_name || '',
  };
}
