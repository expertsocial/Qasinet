import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskEmail, maskRecipients, sendEmail } from '@/lib/email/client';

describe('Email Client Resiliency & Masking', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('maskEmail and maskRecipients', () => {
    it('masks standard email addresses properly without leaking customer PII', () => {
      expect(maskEmail('qasinetltd@gmail.com')).toBe('q***d@gmail.com');
      expect(maskEmail('sanaregeorge08@gmail.com')).toBe('s***8@gmail.com');
      expect(maskEmail('john.doe@domain.co.ke')).toBe('j***e@domain.co.ke');
    });

    it('handles short email prefixes safely', () => {
      expect(maskEmail('a@test.com')).toBe('a***@test.com');
      expect(maskEmail('me@test.com')).toBe('m***@test.com');
    });

    it('handles invalid or empty inputs gracefully without throwing', () => {
      expect(maskEmail('')).toBe('***');
      expect(maskEmail(null as unknown as string)).toBe('***');
      expect(maskEmail('invalid-string')).toBe('***');
    });

    it('masks multiple recipients in an array', () => {
      expect(maskRecipients(['qasinetltd@gmail.com', 'admin@qasinet.com'])).toBe(
        'q***d@gmail.com, a***n@qasinet.com'
      );
    });
  });

  describe('sendEmail validation & mock fallback', () => {
    it('rejects invalid recipient emails immediately without calling Resend', async () => {
      const result = await sendEmail({
        to: 'invalid-email-address',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid recipient/i);
    });

    it('gracefully mocks email send when API key is missing or placeholder', async () => {
      process.env.RESEND_API_KEY = '';
      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Mock Send Test',
        html: '<p>Mock Content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.id).toMatch(/^mock_email_/);
    });
  });
});
