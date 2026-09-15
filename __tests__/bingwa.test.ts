import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BingwaClient } from '../src/lib/providers/bingwa/client';
import { BingwaProvider, formatKenyanPhone } from '../src/lib/providers/bingwa/provider';

describe('Reseller Provider (Bingwa Sokoni)', () => {
  const originalEnv = process.env;
  let mockFetch = vi.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BINGWA_SOKONI_BASE_URL: 'https://test-api.bingwasoko.co.ke/api',
      BINGWA_SOKONI_TILL: '509947',
      BINGWA_SOKONI_API_KEY: 'test-api-key',
    };
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('formatKenyanPhone', () => {
    it('formats 254-prefixed Safaricom phone to 07...', () => {
      expect(formatKenyanPhone('254712345678')).toBe('0712345678');
    });

    it('formats 9-digit phone starting with 7 to 07...', () => {
      expect(formatKenyanPhone('712345678')).toBe('0712345678');
    });

    it('preserves already standard 07... phone', () => {
      expect(formatKenyanPhone('0712345678')).toBe('0712345678');
    });

    it('formats 254-prefixed Airtel phone (01...)', () => {
      expect(formatKenyanPhone('254112345678')).toBe('0112345678');
    });

    it('formats 9-digit Airtel phone starting with 1 to 01...', () => {
      expect(formatKenyanPhone('112345678')).toBe('0112345678');
    });

    it('cleans non-digit characters like spaces and dashes', () => {
      expect(formatKenyanPhone('+254 712-345 678')).toBe('0712345678');
    });

    it('handles empty or null gracefully', () => {
      expect(formatKenyanPhone('')).toBe('');
    });
  });

  describe('BingwaClient', () => {
    it('uses configured base URL and default till', () => {
      const client = new BingwaClient({
        baseUrl: 'https://custom.api/v1',
        defaultTill: '999999',
      });
      expect(client.getDefaultTill()).toBe('999999');
    });

    it('falls back to environment variables or defaults', () => {
      delete process.env.BINGWA_SOKONI_BASE_URL;
      delete process.env.BINGWA_SOKONI_TILL;
      const client = new BingwaClient();
      expect(client.getDefaultTill()).toBe('509947');
    });

    it('successfully posts to /pay endpoint with headers and body', async () => {
      const mockSuccessResponse = {
        status: true,
        message: 'Request accepted for processing',
        transaction_id: 'RES12345678',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSuccessResponse),
      });

      const client = new BingwaClient({ timeoutMs: 5000, maxRetries: 1 });
      const res = await client.requestPay({
        till: '509947',
        amount: 51,
        phone: '0712345678',
        bundle: '1.25GB',
        reference: 'QSN-TEST-001',
      });

      expect(res).toEqual(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://test-api.bingwasoko.co.ke/api/pay');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key');
      expect(JSON.parse(options.body as string)).toMatchObject({
        till: '509947',
        amount: 51,
        phone: '0712345678',
        bundle: '1.25GB',
        reference: 'QSN-TEST-001',
      });
    });

    it('throws immediately on 400 Bad Request without retrying', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid recipient phone number' }),
      });

      const client = new BingwaClient({ timeoutMs: 5000, maxRetries: 3 });

      await expect(
        client.requestPay({
          till: '509947',
          amount: 51,
          phone: '0700000000',
          bundle: '1.25GB',
        })
      ).rejects.toThrow(/Fulfillment provider error: Invalid recipient phone number/);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 500 server error and succeeds on subsequent attempt', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: async () => 'Bad Gateway',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: true, message: 'Delivered' }),
        });

      const client = new BingwaClient({ timeoutMs: 2000, maxRetries: 2 });
      const res = await client.requestPay({
        till: '509947',
        amount: 51,
        phone: '0712345678',
        bundle: '1.25GB',
      });

      expect(res).toEqual({ status: true, message: 'Delivered' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws QasiNetError after exhausting retries on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockRejectedValueOnce(new Error('fetch failed'));

      const client = new BingwaClient({ timeoutMs: 1000, maxRetries: 2 });

      await expect(
        client.requestPay({
          till: '509947',
          amount: 51,
          phone: '0712345678',
          bundle: '1.25GB',
        })
      ).rejects.toThrow(/Fulfillment provider connection failed/);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('BingwaProvider', () => {
    it('vendBundle validates phone number', async () => {
      const provider = new BingwaProvider();
      await expect(
        provider.vendBundle({
          phone: '123',
          bundleCode: '1.25GB',
          amount: 51,
        })
      ).rejects.toThrow(/Invalid Kenyan mobile phone number/);
    });

    it('vendBundle validates bundle code', async () => {
      const provider = new BingwaProvider();
      await expect(
        provider.vendBundle({
          phone: '0712345678',
          bundleCode: '',
          amount: 51,
        })
      ).rejects.toThrow(/Bundle code is required/);
    });

    it('vendBundle validates amount', async () => {
      const provider = new BingwaProvider();
      await expect(
        provider.vendBundle({
          phone: '0712345678',
          bundleCode: '1.25GB',
          amount: 0,
        })
      ).rejects.toThrow(/Valid bundle amount is required/);
    });

    it('vendBundle normalizes phone and formats payload correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: true, message: 'Dispatched' }),
      });

      const provider = new BingwaProvider();
      const res = await provider.vendBundle({
        phone: '254712345678',
        bundleCode: '1.25GB',
        amount: 51,
        reference: 'QSN-ORD-999',
      });

      expect(res).toEqual({ status: true, message: 'Dispatched' });
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const payload = JSON.parse(options.body as string) as Record<string, unknown>;

      expect(payload.phone).toBe('0712345678');
      expect(payload.bundle).toBe('1.25GB');
      expect(payload.amount).toBe(51);
      expect(payload.reference).toBe('QSN-ORD-999');
      expect(payload.till).toBe('509947');
    });

    it('vendAirtime validates minimum amount (KES 5)', async () => {
      const provider = new BingwaProvider();
      await expect(
        provider.vendAirtime({
          phone: '0712345678',
          amount: 3,
        })
      ).rejects.toThrow(/Minimum airtime amount is KES 5/);
    });

    it('vendAirtime formats bundle as AIRTIME and sends request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: true, message: 'Airtime delivered' }),
      });

      const provider = new BingwaProvider();
      const res = await provider.vendAirtime({
        phone: '254722000000',
        amount: 100,
        reference: 'QSN-AIR-100',
      });

      expect(res).toEqual({ status: true, message: 'Airtime delivered' });
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const payload = JSON.parse(options.body as string) as Record<string, unknown>;

      expect(payload.phone).toBe('0722000000');
      expect(payload.bundle).toBe('AIRTIME');
      expect(payload.amount).toBe(100);
      expect(payload.reference).toBe('QSN-AIR-100');
    });
  });
});
