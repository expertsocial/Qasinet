import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-check';
import {
  generateNumericOTP,
  hashOTP,
  clearRateLimitsForTesting,
  storeLoginOTPForTesting,
  requestLoginOTP,
  verifyLoginOTP,
  storeRegistrationOTPForTesting,
  requestRegistrationOTP,
  verifyRegistrationOTP,
} from '@/lib/auth/otp';
import * as emailClient from '@/lib/email/client';

describe('Email-Only Mandatory OTP & Admin Email Restrictions', () => {
  beforeEach(() => {
    clearRateLimitsForTesting();
    vi.restoreAllMocks();
  });

  describe('isAuthorizedAdminEmail Authorization Logic', () => {
    it('accepts official admin emails associated with qasinetltd.com', () => {
      expect(isAuthorizedAdminEmail('qasinetltd@gmail.com')).toBe(true);
      expect(isAuthorizedAdminEmail('QASINETLTD@GMAIL.COM')).toBe(true);
      expect(isAuthorizedAdminEmail('admin@qasinetltd.com')).toBe(true);
      expect(isAuthorizedAdminEmail('info@qasinetltd.com')).toBe(true);
      expect(isAuthorizedAdminEmail('security@qasinetltd.com')).toBe(true);
      expect(isAuthorizedAdminEmail('qasinetltd.com')).toBe(true);
      expect(isAuthorizedAdminEmail('admin@qasinet.com')).toBe(true);
    });

    it('strictly rejects non-admin customer emails', () => {
      expect(isAuthorizedAdminEmail('john.doe@gmail.com')).toBe(false);
      expect(isAuthorizedAdminEmail('customer@yahoo.com')).toBe(false);
      expect(isAuthorizedAdminEmail('user@outlook.com')).toBe(false);
      expect(isAuthorizedAdminEmail('hacker@evil.com')).toBe(false);
      expect(isAuthorizedAdminEmail('')).toBe(false);
      expect(isAuthorizedAdminEmail(null)).toBe(false);
      expect(isAuthorizedAdminEmail(undefined)).toBe(false);
    });
  });

  describe('Mandatory Login OTP (Email Delivery Only)', () => {
    it('dispatches login OTP strictly to email via sendEmail', async () => {
      const sendEmailSpy = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'mock-resend-id',
      });

      const res = await requestLoginOTP('user@example.com', '192.168.1.100');

      expect(res.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);

      const emailArgs = sendEmailSpy.mock.calls[0][0];
      expect(emailArgs.to).toBe('user@example.com');
      expect(emailArgs.subject).toContain('Your QasiNet Login Verification Code:');
      expect(emailArgs.html).toContain('Sign-In Verification');
      // Ensure code in email is 6 digits
      expect(emailArgs.text).toMatch(/\b\d{6}\b/);
    });

    it('verifies valid login OTP code and deletes it immediately (single-use)', async () => {
      const email = 'login-test@example.com';
      const code = '654321';
      storeLoginOTPForTesting(email, code);

      const verifyRes = await verifyLoginOTP(email, code);
      expect(verifyRes.success).toBe(true);

      // Re-verifying the same code immediately fails (single-use)
      const secondAttempt = await verifyLoginOTP(email, code);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toContain('Invalid or expired verification code');
    });

    it('rejects incorrect login code and enforces max attempts', async () => {
      const email = 'bruteforce-test@example.com';
      storeLoginOTPForTesting(email, '999888');

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const attempt = await verifyLoginOTP(email, '000000');
        expect(attempt.success).toBe(false);
        expect(attempt.error).toContain('attempt');
      }

      // 5th failed attempt invalidates code
      const fifthAttempt = await verifyLoginOTP(email, '000000');
      expect(fifthAttempt.success).toBe(false);
      expect(fifthAttempt.error).toContain('invalidated');

      // Even correct code now fails because code was invalidated
      const correctAfterMax = await verifyLoginOTP(email, '999888');
      expect(correctAfterMax.success).toBe(false);
    });

    it('rejects expired login OTP codes', async () => {
      const email = 'expired-test@example.com';
      const pastTime = Date.now() - 1000;
      storeLoginOTPForTesting(email, '123456', pastTime);

      const res = await verifyLoginOTP(email, '123456');
      expect(res.success).toBe(false);
      expect(res.error).toContain('expired');
    });

    it('enforces rate limiting on login OTP requests (max 3 per 15 min)', async () => {
      vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({ success: true, id: 'mock-id' });

      const email = 'ratelimit-login@example.com';
      const ip = '10.0.0.1';

      const r1 = await requestLoginOTP(email, ip);
      expect(r1.success).toBe(true);

      const r2 = await requestLoginOTP(email, ip);
      expect(r2.success).toBe(true);

      const r3 = await requestLoginOTP(email, ip);
      expect(r3.success).toBe(true);

      const r4 = await requestLoginOTP(email, ip);
      expect(r4.success).toBe(false);
      expect(r4.rateLimited).toBe(true);
      expect(r4.message).toContain('Too many');
    });
  });

  describe('Mandatory Registration OTP (Email Delivery Only)', () => {
    it('dispatches registration OTP strictly to email via sendEmail', async () => {
      const sendEmailSpy = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'mock-reg-id',
      });

      const res = await requestRegistrationOTP('newuser@example.com', '192.168.1.101');

      expect(res.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);

      const emailArgs = sendEmailSpy.mock.calls[0][0];
      expect(emailArgs.to).toBe('newuser@example.com');
      expect(emailArgs.subject).toContain('Your QasiNet Account Verification Code:');
      expect(emailArgs.text).toMatch(/\b\d{6}\b/);
    });

    it('verifies valid registration OTP code and deletes upon success', async () => {
      const email = 'reg-success@example.com';
      const code = '789123';
      storeRegistrationOTPForTesting(email, code);

      const verifyRes = await verifyRegistrationOTP(email, code);
      expect(verifyRes.success).toBe(true);

      const secondVerify = await verifyRegistrationOTP(email, code);
      expect(secondVerify.success).toBe(false);
    });
  });
});
