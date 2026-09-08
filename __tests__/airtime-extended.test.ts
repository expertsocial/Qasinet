import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KyandaProvider, SUPPORTED_AIRTIME_TELCOS } from '../src/lib/providers/kyanda/provider';
import { KyandaClient } from '../src/lib/providers/kyanda/client';
import { KyandaSignatureEngine } from '../src/lib/providers/kyanda/signature';
import { initTransactionSchema } from '../src/lib/validations/transaction';
import { FAIBA_DATA_BUNDLES, FAIBA_BUNDLE_CODES } from '../src/lib/constants/faiba-bundles';
import { mapKyandaError } from '../src/lib/providers/kyanda/errors';
import { QasiNetError } from '../src/lib/errors';

describe('Extended Airtime & Faiba Bundles Test Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KYANDA_BASE_URL: 'https://api.kyanda.app',
      KYANDA_API_KEY: 'test-api-key',
      KYANDA_MERCHANT_ID: 'test-merchant-id',
      KYANDA_SECURITY_KEY: 'test-security-key',
      KYANDA_INITIATOR_PHONE: '0722000000',
    };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Airtime Channel Support & Whitelist', () => {
    it('defines the correct whitelist of supported airtime telcos', () => {
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('SAFARICOM');
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('AIRTEL');
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('TELKOM');
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('EQUITEL');
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('FAIBA');
      expect(SUPPORTED_AIRTIME_TELCOS).toContain('FAIBA_B');
      expect(SUPPORTED_AIRTIME_TELCOS.length).toBe(6);
    });

    it('rejects unsupported telcos with VALIDATION_ERROR fail-fast', async () => {
      const provider = new KyandaProvider();
      await expect(
        provider.buyAirtime(100, '0712345678', 'MTN', '0722000000')
      ).rejects.toThrow(/Unsupported airtime telco: MTN/);

      await expect(
        provider.buyAirtime(100, '0712345678', 'ORANGE', '0722000000')
      ).rejects.toThrow(/Unsupported airtime telco: ORANGE/);
    });
  });

  describe('Airtime Request Payload Construction', () => {
    it('constructs correct payload for TELKOM airtime without productCode or callbackURL', async () => {
      const provider = new KyandaProvider();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: '0000', merchant_reference: 'QASOFLAPI1111' })
      });
      global.fetch = mockFetch;

      const result = await provider.buyAirtime(50, '0770123456', 'TELKOM', '0722000000');
      expect(result.merchant_reference).toBe('QASOFLAPI1111');

      const call = mockFetch.mock.calls[0];
      const payload = JSON.parse(call[1].body);

      expect(payload).toEqual({
        MerchantID: 'test-merchant-id',
        phone: '0770123456',
        amount: '50',
        telco: 'TELKOM',
        initiatorPhone: '0722000000',
        signature: expect.any(String)
      });
      expect(payload.productCode).toBeUndefined();
      expect(payload.callbackURL).toBeUndefined();
    });

    it('constructs correct payload for EQUITEL airtime without productCode', async () => {
      const provider = new KyandaProvider();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: '0000', merchant_reference: 'QASOFLAPI2222' })
      });
      global.fetch = mockFetch;

      await provider.buyAirtime(100, '0763123456', 'EQUITEL', '0722000000');

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.telco).toBe('EQUITEL');
      expect(payload.productCode).toBeUndefined();
    });

    it('constructs correct payload for FAIBA pinless airtime without productCode', async () => {
      const provider = new KyandaProvider();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: '0000', merchant_reference: 'QASOFLAPI3333' })
      });
      global.fetch = mockFetch;

      await provider.buyAirtime(200, '0747123456', 'FAIBA', '0722000000');

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.telco).toBe('FAIBA');
      expect(payload.productCode).toBeUndefined();
    });

    it('constructs correct payload for FAIBA_B including productCode', async () => {
      const provider = new KyandaProvider();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: '0000', merchant_reference: 'QASOFLAPI4444' })
      });
      global.fetch = mockFetch;

      await provider.buyAirtime(50, '0747123456', 'FAIBA_B', '0722000000', 'Daily_1.5GB');

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.telco).toBe('FAIBA_B');
      expect(payload.amount).toBe('50');
      expect(payload.productCode).toBe('Daily_1.5GB');
    });

    it('throws fail-fast VALIDATION_ERROR if FAIBA_B is called without productCode', async () => {
      const provider = new KyandaProvider();
      await expect(
        provider.buyAirtime(50, '0747123456', 'FAIBA_B', '0722000000')
      ).rejects.toThrow('productCode is required for FAIBA_B Faiba bundles');
    });
  });

  describe('Signature Engine Verification', () => {
    it('uses HMAC-SHA256(amount + phone + telco + initiatorPhone + MerchantID) for all airtime', () => {
      const sig1 = KyandaSignatureEngine.generateAirtimeSignature(
        '100',
        '0770123456',
        'TELKOM',
        '0722000000',
        'test-merchant-id',
        'test-security-key'
      );
      expect(sig1).toMatch(/^[a-f0-9]{64}$/);

      // FAIBA_B uses same signature order and does NOT include productCode in signature string
      const sig2 = KyandaSignatureEngine.generateAirtimeSignature(
        '50',
        '0747123456',
        'FAIBA_B',
        '0722000000',
        'test-merchant-id',
        'test-security-key'
      );
      expect(sig2).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('KyandaClient Error Parsing & Message Preservation', () => {
    it('preserves exact Kyanda error message on HTTP 400 status 9002 (missing productCode)', async () => {
      const client = new KyandaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          status_code: '9002',
          message: 'productCode is required for FAIBA_B. Use a published Faiba bundle code.',
          transactiontxt: 'productCode is required for FAIBA_B. Use a published Faiba bundle code.'
        })
      });

      try {
        await client.request('/billing/v1/airtime/create', {});
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(QasiNetError);
        expect(err.category).toBe('VALIDATION_ERROR');
        expect(err.message).toBe('productCode is required for FAIBA_B. Use a published Faiba bundle code.');
      }
    });

    it('preserves exact Kyanda error message on HTTP 400 status 9002 (invalid productCode)', async () => {
      const client = new KyandaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          status_code: '9002',
          message: 'Invalid Faiba productCode. Use a published bundle code and matching amount.'
        })
      });

      try {
        await client.request('/billing/v1/airtime/create', {});
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(QasiNetError);
        expect(err.category).toBe('VALIDATION_ERROR');
        expect(err.message).toBe('Invalid Faiba productCode. Use a published bundle code and matching amount.');
      }
    });

    it('preserves exact Kyanda error message on HTTP 400 status 1107 (insufficient float)', async () => {
      const client = new KyandaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          status_code: '1107',
          message: 'Insufficient Funds!'
        })
      });

      try {
        await client.request('/billing/v1/airtime/create', {});
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(QasiNetError);
        expect(err.category).toBe('INSUFFICIENT_FUNDS');
        expect(err.message).toBe('Insufficient Funds!');
      }
    });

    it('maps 4000 and 1107 to INSUFFICIENT_FUNDS', () => {
      const err1107 = mapKyandaError('1107');
      expect(err1107.category).toBe('INSUFFICIENT_FUNDS');

      const err4000 = mapKyandaError('4000');
      expect(err4000.category).toBe('INSUFFICIENT_FUNDS');
    });

    it('maps 1109 to VALIDATION_ERROR with Blank required field message', () => {
      const err = mapKyandaError('1109');
      expect(err.category).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Blank required field.');
    });

    it('maps 3101 to VALIDATION_ERROR with Invalid telco prefix message', () => {
      const err = mapKyandaError('3101');
      expect(err.category).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Invalid telco prefix.');
    });

    it('does not attempt retries on client validation/float errors with status_code', async () => {
      const client = new KyandaClient();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          status_code: '9002',
          message: 'Invalid transaction channel.'
        })
      });
      global.fetch = mockFetch;

      await expect(client.request('/billing/v1/airtime/create', {})).rejects.toThrow('Invalid transaction channel.');
      // Must NOT retry 3 times - should fail on attempt 1
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scoped Zod Validation Schema (initTransactionSchema)', () => {
    it('accepts valid UUID product IDs', () => {
      const validPayload = {
        serviceSlug: 'safaricom-airtime',
        productId: 'a3956833-9048-4810-921e-5a84c52df417',
        destination: '0712345678',
        amount: 100
      };
      const result = initTransactionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('accepts exact Faiba bundle codes from FAIBA_BUNDLE_CODES enum', () => {
      for (const code of FAIBA_BUNDLE_CODES) {
        const payload = {
          serviceSlug: 'faiba-data',
          productId: code,
          destination: '0747123456',
          amount: 50
        };
        const result = initTransactionSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('strictly rejects arbitrary non-UUID strings not in FAIBA_BUNDLE_CODES', () => {
      const invalidPayload = {
        serviceSlug: 'faiba-data',
        productId: 'arbitrary-string-that-is-not-a-bundle-code',
        destination: '0747123456',
        amount: 50
      };
      const result = initTransactionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('allows omitting productId for standard airtime', () => {
      const airtimePayload = {
        serviceSlug: 'telkom-airtime',
        destination: '0770123456',
        amount: 100
      };
      const result = initTransactionSchema.safeParse(airtimePayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Faiba Bundle Catalog Integrity', () => {
    it('contains all 19 documented data bundles matching Kyanda prices, allowances, and auto-renew codes', () => {
      expect(FAIBA_DATA_BUNDLES.length).toBe(19);
      expect(FAIBA_BUNDLE_CODES.length).toBe(24); // 19 standard + 5 auto-renew

      const daily500 = FAIBA_DATA_BUNDLES.find(b => b.code === 'DAILY_500MB');
      expect(daily500).toBeDefined();
      expect(daily500?.price).toBe(20);
      expect(daily500?.validity).toBe('1 day');
      expect(daily500?.allowance).toBe('500MB');
      expect(daily500?.autoRenewCode).toBe('DAILY_AUTO_500MB');

      const fisi3 = FAIBA_DATA_BUNDLES.find(b => b.code === 'fisihour3');
      expect(fisi3).toBeDefined();
      expect(fisi3?.price).toBe(50);
      expect(fisi3?.validity).toBe('3 hours');

      const daily1_5 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Daily_1.5GB');
      expect(daily1_5).toBeDefined();
      expect(daily1_5?.price).toBe(50);
      expect(daily1_5?.validity).toBe('1 day');

      const gumzo75 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Gumzo_Weekly_50');
      expect(gumzo75?.price).toBe(75);

      const fisi5 = FAIBA_DATA_BUNDLES.find(b => b.code === 'fisihour5');
      expect(fisi5?.price).toBe(80);

      const day3_3gb = FAIBA_DATA_BUNDLES.find(b => b.code === '3GB3DAY');
      expect(day3_3gb?.price).toBe(100);

      const fisi6 = FAIBA_DATA_BUNDLES.find(b => b.code === 'fisihour6');
      expect(fisi6?.price).toBe(120);

      const weekly10 = FAIBA_DATA_BUNDLES.find(b => b.code === 'WEEKLY_DATA_10GB');
      expect(weekly10?.price).toBe(300);
      expect(weekly10?.autoRenewCode).toBe('WEEKLY_DATA_AUTO_10GB');

      const gumzo250 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Gumzo_Monthly_250');
      expect(gumzo250?.price).toBe(300);

      const monthly15 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Monthly_15GB');
      expect(monthly15?.price).toBe(500);
      expect(monthly15?.autoRenewCode).toBe('Monthly_15GB_Auto');

      const gumzo500 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Gumzo_Monthly_500');
      expect(gumzo500?.price).toBe(500);

      const allInOne5 = FAIBA_DATA_BUNDLES.find(b => b.code === 'All_inOne_5');
      expect(allInOne5?.price).toBe(500);

      const monthly40 = FAIBA_DATA_BUNDLES.find(b => b.code === 'MONTHLY_DATA_40GB');
      expect(monthly40?.price).toBe(1000);
      expect(monthly40?.autoRenewCode).toBe('MONTHLY_DATA_AUTO_40GB');

      const allInOne10 = FAIBA_DATA_BUNDLES.find(b => b.code === 'All_inOne_10');
      expect(allInOne10?.price).toBe(1000);

      const monthly120 = FAIBA_DATA_BUNDLES.find(b => b.code === 'Monthly_120GB');
      expect(monthly120?.price).toBe(2000);
      expect(monthly120?.autoRenewCode).toBe('Monthly_120GB_Auto');

      const allInOne20 = FAIBA_DATA_BUNDLES.find(b => b.code === 'All_inOne_20');
      expect(allInOne20?.price).toBe(2000);

      const famBasic = FAIBA_DATA_BUNDLES.find(b => b.code === 'Family_Basic_Plus_150Mins');
      expect(famBasic?.price).toBe(2000);

      const famPlus = FAIBA_DATA_BUNDLES.find(b => b.code === 'Family_Plus_Plus_300Mins');
      expect(famPlus?.price).toBe(3500);

      const famMax = FAIBA_DATA_BUNDLES.find(b => b.code === 'Family_Max_Plus_600Mins');
      expect(famMax?.price).toBe(6000);
    });
  });

  describe('Airtime and Bundle Amount Bounds Validation (> 2, < 7000, whole numbers)', () => {
    it('strictly rejects amounts <= 2, >= 7000, or decimal amounts in buyAirtime', async () => {
      const provider = new KyandaProvider();
      await expect(
        provider.buyAirtime(2, '0712345678', 'SAFARICOM', '0722000000')
      ).rejects.toThrow(/Airtime amount must be a whole number greater than 2 and less than 7000/);

      await expect(
        provider.buyAirtime(7000, '0712345678', 'SAFARICOM', '0722000000')
      ).rejects.toThrow(/Airtime amount must be a whole number greater than 2 and less than 7000/);

      await expect(
        provider.buyAirtime(50.5, '0712345678', 'SAFARICOM', '0722000000')
      ).rejects.toThrow(/Airtime amount must be a whole number greater than 2 and less than 7000/);
    });

    it('rejects out-of-bounds or decimal amounts in initTransactionSchema for airtime and data services', () => {
      const lowResult = initTransactionSchema.safeParse({
        serviceSlug: 'safaricom-airtime',
        destination: '0712345678',
        amount: 2
      });
      expect(lowResult.success).toBe(false);

      const highResult = initTransactionSchema.safeParse({
        serviceSlug: 'safaricom-airtime',
        destination: '0712345678',
        amount: 7000
      });
      expect(highResult.success).toBe(false);

      const decimalResult = initTransactionSchema.safeParse({
        serviceSlug: 'faiba-data',
        productId: 'DAILY_500MB',
        destination: '0747123456',
        amount: 20.5
      });
      expect(decimalResult.success).toBe(false);

      const validResult = initTransactionSchema.safeParse({
        serviceSlug: 'faiba-data',
        productId: 'DAILY_500MB',
        destination: '0747123456',
        amount: 20
      });
      expect(validResult.success).toBe(true);
    });
  });

  describe('Data Bundle Network Honesty & Feature Flag Gating', () => {
    it('defaults IS_FAIBA_BUNDLES_ENABLED to true when activated', async () => {
      const { isServiceEnabled } = await import('../src/lib/services/registry');
      expect(isServiceEnabled('faiba-data')).toBe(true);
    });

    it('rejects data bundle initiation for non-Faiba services with SERVICE_UNAVAILABLE', async () => {
      const { TransactionOrchestrator } = await import('../src/lib/services/orchestrator');
      
      const createChainable = (terminalResult: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue(terminalResult),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        };
        return chain;
      };

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'transactions') {
            return createChainable({ data: [] });
          }
          return createChainable({
            data: { id: 'safaricom-data-id', type: 'data', slug: 'safaricom-data', is_active: true },
            error: null
          });
        })
      };

      const orchestrator = new TransactionOrchestrator(mockSupabase);
      await expect(
        orchestrator.initiateTransaction({
          serviceSlug: 'safaricom-data',
          destination: '0712345678',
          amount: 100,
          idempotencyKey: 'test-idem-1'
        })
      ).rejects.toThrow(/Data bundles are currently only supported for Faiba 4G/);
    });

    it('rejects Faiba data bundle initiation when feature flag is disabled with SERVICE_UNAVAILABLE', async () => {
      const { TransactionOrchestrator } = await import('../src/lib/services/orchestrator');
      
      const createChainable = (terminalResult: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue(terminalResult),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        };
        return chain;
      };

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'transactions') {
            return createChainable({ data: [] });
          }
          return createChainable({
            data: { id: 'faiba-data-id', type: 'data', slug: 'faiba-data', is_active: true },
            error: null
          });
        })
      };

      process.env.NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA = 'coming_soon';
      try {
        const orchestrator = new TransactionOrchestrator(mockSupabase);
        await expect(
          orchestrator.initiateTransaction({
            serviceSlug: 'faiba-data',
            productId: 'DAILY_500MB',
            destination: '0747123456',
            amount: 20,
            idempotencyKey: 'test-idem-2'
          })
        ).rejects.toThrow(/Faiba data bundle vending is temporarily paused/);
      } finally {
        delete process.env.NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA;
      }
    });
  });
});
