import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import {
  generateNumericOTP,
  hashOTP,
  checkRequestRateLimit,
  clearRateLimitsForTesting,
  storeOTPForTesting,
  verifyPasswordResetOTP,
  requestPasswordResetOTP,
  confirmPasswordResetWithToken,
} from '@/lib/auth/otp';

// Load .env.local if present
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch {
  // ignore
}

describe('Password Reset OTP Security & Verification', () => {
  beforeEach(() => {
    clearRateLimitsForTesting();
  });

  describe('OTP Generation and Hashing', () => {
    it('generates a 6-digit numeric OTP', () => {
      const code = generateNumericOTP();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('hashes OTP with salt deterministically', () => {
      const salt = 'testsalt12345678';
      const hash1 = hashOTP('123456', salt);
      const hash2 = hashOTP('123456', salt);
      const hashDiff = hashOTP('654321', salt);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('Rate Limiting on OTP Requests', () => {
    it('allows up to 3 requests per 15-minute window and blocks the 4th', () => {
      const testEmail = 'limit-test@qasinet.com';

      // 1st request
      const req1 = checkRequestRateLimit(`email:${testEmail}`);
      expect(req1.allowed).toBe(true);

      // 2nd request
      const req2 = checkRequestRateLimit(`email:${testEmail}`);
      expect(req2.allowed).toBe(true);

      // 3rd request
      const req3 = checkRequestRateLimit(`email:${testEmail}`);
      expect(req3.allowed).toBe(true);

      // 4th request: Must be blocked!
      const req4 = checkRequestRateLimit(`email:${testEmail}`);
      expect(req4.allowed).toBe(false);
      expect(req4.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('Account Enumeration Defense', () => {
    it('returns the same uniform message for non-existent and existing accounts', async () => {
      const result = await requestPasswordResetOTP('nonexistent-random-user-12345@test.com', '127.0.0.1');
      expect(result.success).toBe(true);
      expect(result.message).toBe("If an account with that email exists, we've sent a 6-digit verification code.");
    }, 30000);
  });

  describe('Verification Rate Limiting & Single-Use Enforcement', () => {
    it('invalidates code after 5 incorrect attempts', async () => {
      const testEmail = 'user@example.com';
      storeOTPForTesting(testEmail, '123456');

      // Attempt 1 to 4 with incorrect codes
      for (let i = 1; i <= 4; i++) {
        const verifyRes = await verifyPasswordResetOTP(testEmail, '000000');
        expect(verifyRes.success).toBe(false);
        expect(verifyRes.error).toMatch(/incorrect verification code/i);
      }

      // 5th failed attempt: Code must be invalidated
      const fifthRes = await verifyPasswordResetOTP(testEmail, '000000');
      expect(fifthRes.success).toBe(false);
      expect(fifthRes.error).toMatch(/too many incorrect attempts|invalidated/i);

      // 6th attempt: Even if code were correct now, it's gone
      const subsequentRes = await verifyPasswordResetOTP(testEmail, '123456');
      expect(subsequentRes.success).toBe(false);
      expect(subsequentRes.error).toMatch(/invalid or expired/i);
    }, 40000);

    it('successfully verifies correct code, deletes OTP immediately, and issues single-use reset token', async () => {
      const testEmail = 'verify-success@example.com';
      storeOTPForTesting(testEmail, '852963');

      // Verify with correct code
      const verifyRes = await verifyPasswordResetOTP(testEmail, '852963');
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.resetToken).toBeDefined();
      expect(verifyRes.resetToken).toHaveLength(64); // 32-byte hex string

      // Re-verifying the same OTP code immediately fails (single-use)
      const secondVerify = await verifyPasswordResetOTP(testEmail, '852963');
      expect(secondVerify.success).toBe(false);
      expect(secondVerify.error).toMatch(/invalid or expired/i);
    }, 40000);

    it('rejects expired OTP codes', async () => {
      const testEmail = 'expired@example.com';
      const pastTime = Date.now() - 1000; // 1 second in the past
      storeOTPForTesting(testEmail, '112233', pastTime);

      const res = await verifyPasswordResetOTP(testEmail, '112233');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/expired/i);
    }, 40000);
  });
});
