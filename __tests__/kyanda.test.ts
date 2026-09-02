import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KyandaSignatureEngine } from '../src/lib/providers/kyanda/signature';
import { mapKyandaError } from '../src/lib/providers/kyanda/errors';
import { KyandaClient } from '../src/lib/providers/kyanda/client';
import { KyandaProvider } from '../src/lib/providers/kyanda/provider';

describe('Kyanda Provider Foundation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KYANDA_BASE_URL: 'http://sandbox.kyanda.io:3030',
      KYANDA_API_KEY: 'test-api-key',
      KYANDA_MERCHANT_ID: 'test-merchant',
      KYANDA_SECURITY_KEY: 'test-security-key',
    };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('KyandaSignatureEngine', () => {
    it('generates correct account balance signature', () => {
      const signature = KyandaSignatureEngine.generateAccountBalanceSignature('kyanda', 'test-security-key');
      // Just check it returns a hex string of 64 chars (sha256)
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates correct transaction check signature', () => {
      const signature = KyandaSignatureEngine.generateTransactionCheckSignature('kyanda', 'tx-123', 'test-security-key');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Error Mapping', () => {
    it('maps 1104 to PROVIDER_ERROR', () => {
      const error = mapKyandaError('1104');
      expect(error.category).toBe('PROVIDER_ERROR');
    });

    it('maps 1107 to INSUFFICIENT_FLOAT', () => {
      const error = mapKyandaError('1107');
      expect(error.category).toBe('INSUFFICIENT_FLOAT');
    });

    it('maps 8006 to DUPLICATE_REQUEST', () => {
      const error = mapKyandaError('8006');
      expect(error.category).toBe('DUPLICATE_REQUEST');
    });

    it('defaults unknown errors to UNKNOWN', () => {
      const error = mapKyandaError('9999', 'Something weird');
      expect(error.category).toBe('UNKNOWN');
      expect(error.message).toBe('Something weird');
    });
  });

  describe('KyandaClient', () => {
    it('handles successful requests', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '0000', message: 'Success' }),
      });

      const client = new KyandaClient();
      const response = await client.request('/test', { foo: 'bar' });
      
      expect(response).toEqual({ status_code: '0000', message: 'Success' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws mapped QasiNetError for API level errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '1107', transactiontxt: 'Insufficient float balance.' }),
      });

      const client = new KyandaClient();
      await expect(client.request('/test', {})).rejects.toMatchObject({
        category: 'INSUFFICIENT_FLOAT',
        message: 'Insufficient float balance.',
      });
      // Should not retry on these API errors
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('retries on network failure', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status_code: '0000' }),
        });

      const client = new KyandaClient();
      const response = await client.request('/test', {}, { retries: 1 });
      
      expect(response).toEqual({ status_code: '0000' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('KyandaProvider', () => {
    it('checkAccountBalance sends correct payload', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ Account_Bal: 1000, Earnings_Bal: 50 }),
      });

      const provider = new KyandaProvider();
      const result = await provider.checkAccountBalance();

      expect(result.Account_Bal).toBe(1000);
      
      // Verify signature generation was included in payload
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/billing/v1/account-balance');
      const body = JSON.parse(fetchCall[1].body);
      expect(body.MerchantID).toBe('test-merchant');
      expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('checkTransactionStatus sends correct payload', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status: '200', details: { Status: 'Success' } }),
      });

      const provider = new KyandaProvider();
      const result = await provider.checkTransactionStatus('TX-12345');

      expect(result.details.Status).toBe('Success');
      
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/billing/v1/transaction-check');
      const body = JSON.parse(fetchCall[1].body);
      expect(body.MerchantID).toBe('test-merchant');
      expect(body.transactionRef).toBe('TX-12345');
      expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('buyAirtime sends correct payload', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '0000', merchant_reference: 'KY-123' }),
      });

      const provider = new KyandaProvider();
      const result = await provider.buyAirtime(50, '0712345678', 'SAFARICOM', '0712345678');

      expect(result.merchant_reference).toBe('KY-123');
      
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/billing/v1/airtime/create');
      const body = JSON.parse(fetchCall[1].body);
      expect(body.amount).toBe('50');
      expect(body.phone).toBe('0712345678');
      expect(body.telco).toBe('SAFARICOM');
      expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('payBill sends correct payload', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '0000', merchant_reference: 'KY-456' }),
      });

      const provider = new KyandaProvider();
      const result = await provider.payBill(500, '4123456', 'KPLC_PREPAID', '0712345678');

      expect(result.merchant_reference).toBe('KY-456');
      
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/billing/v1/bill/create');
      const body = JSON.parse(fetchCall[1].body);
      expect(body.amount).toBe('500');
      expect(body.account).toBe('4123456');
      expect(body.telco).toBe('KPLC_PREPAID');
      expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
