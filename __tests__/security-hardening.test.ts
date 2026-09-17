import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getClientIp, checkRateLimit } from '@/lib/security/rate-limit';
import { NextRequest } from 'next/server';

describe('Security Hardening Tests', () => {
  describe('Client IP Extraction', () => {
    it('extracts the first public client IP from comma-separated X-Forwarded-For header', () => {
      const req = new Request('https://qasinet.vercel.app/api/transactions', {
        headers: {
          'x-forwarded-for': '197.232.55.10, 10.0.0.1, 172.16.0.1',
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe('197.232.55.10');
    });

    it('falls back to X-Real-IP if X-Forwarded-For is missing', () => {
      const req = new Request('https://qasinet.vercel.app/api/transactions', {
        headers: {
          'x-real-ip': '102.135.12.88',
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe('102.135.12.88');
    });

    it('falls back to 127.0.0.1 if no proxy headers are present', () => {
      const req = new Request('https://qasinet.vercel.app/api/transactions');
      const ip = getClientIp(req);
      expect(ip).toBe('127.0.0.1');
    });
  });

  describe('Rate Limiter Utility', () => {
    it('permits requests within limit and rejects when exceeded', () => {
      const id = `test-ip-${Date.now()}`;
      const limit = 3;
      const windowMs = 10000;

      // Request 1
      const res1 = checkRateLimit(id, { limit, windowMs });
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      // Request 2
      const res2 = checkRateLimit(id, { limit, windowMs });
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      // Request 3
      const res3 = checkRateLimit(id, { limit, windowMs });
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);

      // Request 4 (Exceeded)
      const res4 = checkRateLimit(id, { limit, windowMs });
      expect(res4.success).toBe(false);
      expect(res4.remaining).toBe(0);
    });
  });

  describe('Production Test Endpoints Lockout', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('blocks /api/test-daraja in production with 404', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { GET } = await import('@/app/api/test-daraja/route');
      const req = new NextRequest('https://qasinet.vercel.app/api/test-daraja');

      const response = await GET(req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });

    it('blocks /api/test-kyanda in production with 404', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { GET } = await import('@/app/api/test-kyanda/route');
      const req = new Request('https://qasinet.vercel.app/api/test-kyanda');

      const response = await GET(req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });
  });

  describe('Cron Reconciliation Authorization (Fail-Closed)', () => {
    const originalSecret = process.env.CRON_SECRET;

    afterEach(() => {
      process.env.CRON_SECRET = originalSecret;
    });

    it('returns 401 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const { GET } = await import('@/app/api/cron/reconcile/route');
      const req = new Request('https://qasinet.vercel.app/api/cron/reconcile');

      const response = await GET(req);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when Authorization header does not match CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-token-xyz';
      const { GET } = await import('@/app/api/cron/reconcile/route');
      const req = new Request('https://qasinet.vercel.app/api/cron/reconcile', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });

  describe('Bingwa Sokoni Webhook Secret Verification', () => {
    const originalSecret = process.env.BINGWA_WEBHOOK_SECRET;

    afterEach(() => {
      process.env.BINGWA_WEBHOOK_SECRET = originalSecret;
    });

    it('rejects callbacks with 401 when secret is required and missing', async () => {
      process.env.BINGWA_WEBHOOK_SECRET = 'secret-token-12345';
      const { POST } = await import('@/app/api/webhooks/bingwa/route');

      const req = new NextRequest('https://qasinet.vercel.app/api/webhooks/bingwa', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reference: 'QSN-TEST-123', status: 'SUCCESS' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Unauthorized webhook');
    });
  });
});
