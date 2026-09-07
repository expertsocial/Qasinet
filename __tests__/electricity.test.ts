import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { getPaybillAccountField, getKplcChannelCode } from '../src/lib/providers/kyanda/paybill-config';
import { KyandaSignatureEngine } from '../src/lib/providers/kyanda/signature';
import { KyandaProvider } from '../src/lib/providers/kyanda/provider';
import { ElectricityServiceHandler } from '../src/lib/services/electricity';
import { mapKyandaError } from '../src/lib/providers/kyanda/errors';
import { QasiNetError } from '../src/lib/errors';

describe('Electricity & PayBill Integration Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
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

  describe('PayBill Configuration Resolution', () => {
    it('defaults account field to "account"', () => {
      delete process.env.KYANDA_PAYBILL_ACCOUNT_FIELD;
      expect(getPaybillAccountField()).toBe('account');
    });

    it('resolves account field to "phone" when env var is set to phone', () => {
      process.env.KYANDA_PAYBILL_ACCOUNT_FIELD = 'phone';
      expect(getPaybillAccountField()).toBe('phone');
    });

    it('safeguards unconfigured KPLC prepaid channel code without throwing', () => {
      delete process.env.KYANDA_KPLC_PREPAID_CHANNEL;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const code = getKplcChannelCode('prepaid');
      expect(code).toBe('');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('safeguards unconfigured KPLC postpaid channel code without throwing', () => {
      delete process.env.KYANDA_KPLC_POSTPAID_CHANNEL;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const code = getKplcChannelCode('postpaid');
      expect(code).toBe('');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('resolves configured KPLC prepaid channel code', () => {
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';
      expect(getKplcChannelCode('prepaid')).toBe('KPLC_PREPAID');
    });

    it('resolves configured KPLC postpaid channel code', () => {
      process.env.KYANDA_KPLC_POSTPAID_CHANNEL = 'KPLC_POSTPAID';
      expect(getKplcChannelCode('postpaid')).toBe('KPLC_POSTPAID');
    });
  });

  describe('PayBill Signature Engine', () => {
    it('generates exact HMAC-SHA256 signature matching Kyanda docs specification', () => {
      const amount = 500;
      const account = '14123456789';
      const telco = 'KPLC_PREPAID';
      const initiatorPhone = '0722647928';
      const merchantId = 'test-merchant';
      const securityKey = 'test-security-key';

      const signature = KyandaSignatureEngine.generateBillSignature(
        amount,
        account,
        telco,
        initiatorPhone,
        merchantId,
        securityKey
      );

      const expectedData = `${amount}${account}${telco}${initiatorPhone}${merchantId}`;
      const expectedHash = createHmac('sha256', securityKey).update(expectedData).digest('hex');

      expect(signature).toBe(expectedHash);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('KyandaProvider.payBill Payload Construction', () => {
    it('sends "account" field in payload by default', async () => {
      delete process.env.KYANDA_PAYBILL_ACCOUNT_FIELD;
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '0000', merchant_reference: 'KY-BILL-001' }),
      });

      const provider = new KyandaProvider();
      const result = await provider.payBill(100, '14123456789', 'KPLC_PREPAID', '0722647928');

      expect(result.merchant_reference).toBe('KY-BILL-001');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/billing/v1/bill/create');
      const body = JSON.parse(fetchCall[1].body);

      expect(body.account).toBe('14123456789');
      expect(body.phone).toBeUndefined();
      expect(body.amount).toBe('100');
      expect(body.telco).toBe('KPLC_PREPAID');
      expect(body.initiatorPhone).toBe('0722647928');
      expect(body.MerchantID).toBe('test-merchant');
      expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('sends "phone" field in payload when KYANDA_PAYBILL_ACCOUNT_FIELD is "phone"', async () => {
      process.env.KYANDA_PAYBILL_ACCOUNT_FIELD = 'phone';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: '0000', merchant_reference: 'KY-BILL-002' }),
      });

      const provider = new KyandaProvider();
      await provider.payBill(250, '14123456789', 'KPLC_PREPAID', '0722647928');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.phone).toBe('14123456789');
      expect(body.account).toBeUndefined();
    });
  });

  describe('ElectricityServiceHandler', () => {
    it('throws VALIDATION_ERROR if meterNumber is empty', async () => {
      const provider = new KyandaProvider();
      const handler = new ElectricityServiceHandler(provider);

      await expect(
        handler.vendElectricity({
          amount: 500,
          meterNumber: '   ',
          initiatorPhone: '0722647928',
        })
      ).rejects.toMatchObject({
        category: 'VALIDATION_ERROR',
        message: 'Meter number is required for electricity vending.',
      });
    });

    it('throws SERVICE_UNAVAILABLE if KPLC channel code is not configured', async () => {
      delete process.env.KYANDA_KPLC_PREPAID_CHANNEL;
      const provider = new KyandaProvider();
      const handler = new ElectricityServiceHandler(provider);

      await expect(
        handler.vendElectricity({
          amount: 500,
          meterNumber: '14123456789',
          initiatorPhone: '0722647928',
        })
      ).rejects.toMatchObject({
        category: 'SERVICE_UNAVAILABLE',
      });
    });

    it('successfully vends electricity and extracts token, units, and receipt', async () => {
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: '0000',
          merchant_reference: 'KY-TOKEN-999',
          Token: '1234-5678-9012-3456-7890',
          Units: '32.5 kWh',
          Receipt: 'REC-123456',
        }),
      });

      const provider = new KyandaProvider();
      const handler = new ElectricityServiceHandler(provider);

      const result = await handler.vendElectricity({
        amount: 1000,
        meterNumber: '14123456789',
        type: 'prepaid',
        initiatorPhone: '0722647928',
      });

      expect(result.merchant_reference).toBe('KY-TOKEN-999');
      expect(result.token).toBe('1234-5678-9012-3456-7890');
      expect(result.units).toBe('32.5 kWh');
      expect(result.receipt).toBe('REC-123456');
    });
  });

  describe('Pay Bill & Kyanda Error Mappings', () => {
    it('maps 8001 (invalid meter or account) to VALIDATION_ERROR', () => {
      const err = mapKyandaError('8001');
      expect(err.category).toBe('VALIDATION_ERROR');
      expect(err.message).toContain('meter');
    });

    it('maps 8003 (invalid telco/channel) to PROVIDER_ERROR', () => {
      const err = mapKyandaError('8003');
      expect(err.category).toBe('PROVIDER_ERROR');
      expect(err.message).toContain('Telco');
    });

    it('maps 8004 to VALIDATION_ERROR', () => {
      const err = mapKyandaError('8004');
      expect(err.category).toBe('VALIDATION_ERROR');
    });

    it('maps 8005 to VALIDATION_ERROR', () => {
      const err = mapKyandaError('8005');
      expect(err.category).toBe('VALIDATION_ERROR');
    });

    it('maps 1107 to INSUFFICIENT_FLOAT', () => {
      const err = mapKyandaError('1107');
      expect(err.category).toBe('INSUFFICIENT_FLOAT');
    });

    it('maps 7001 to VALIDATION_ERROR', () => {
      const err = mapKyandaError('7001');
      expect(err.category).toBe('VALIDATION_ERROR');
      expect(err.message).toContain('Transaction not found');
    });
  });
});
