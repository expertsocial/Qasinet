import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import {
  generateAdminNumericOTP,
  hashAdminOTP,
  checkAdminRateLimit,
  clearAdminStateForTesting,
  validatePasswordStrength,
} from '@/lib/auth/admin-account';

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

describe('Admin Account Management Security & Verification', () => {
  beforeEach(() => {
    clearAdminStateForTesting();
  });

  describe('Password Strength Validation', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const result = validatePasswordStrength('Ab1!xyz');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long.');
    });

    it('rejects passwords missing uppercase letters', () => {
      const result = validatePasswordStrength('lowercase123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter.');
    });

    it('rejects passwords missing lowercase letters', () => {
      const result = validatePasswordStrength('UPPERCASE123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter.');
    });

    it('rejects passwords missing numbers', () => {
      const result = validatePasswordStrength('NoNumbersHere!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number.');
    });

    it('rejects passwords missing special characters', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*...).');
    });

    it('accepts compliant, strong passwords', () => {
      const result = validatePasswordStrength('Admin#Secure2026!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Admin OTP Generation & Hashing', () => {
    it('generates a 6-digit numeric OTP', () => {
      const code = generateAdminNumericOTP();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    });

    it('hashes OTP with salt using SHA-256 deterministically', () => {
      const salt = 'randomSaltHex1234';
      const hash1 = hashAdminOTP('123456', salt);
      const hash2 = hashAdminOTP('123456', salt);
      const hashDiff = hashAdminOTP('654321', salt);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('Rate Limiting on Admin OTP Requests', () => {
    it('allows up to 3 requests per 15-minute window and blocks subsequent attempts', () => {
      const adminKey = 'admin-id:7f4de59c-5754-4ae3-8dfd-3c9f4a4a1f2d';

      const r1 = checkAdminRateLimit(adminKey);
      expect(r1.allowed).toBe(true);

      const r2 = checkAdminRateLimit(adminKey);
      expect(r2.allowed).toBe(true);

      const r3 = checkAdminRateLimit(adminKey);
      expect(r3.allowed).toBe(true);

      // 4th request within 15 minutes MUST be blocked
      const r4 = checkAdminRateLimit(adminKey);
      expect(r4.allowed).toBe(false);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
    });
  });
});
