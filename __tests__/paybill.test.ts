import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PayBillServiceHandler, 
  SUPPORTED_TV_PROVIDERS, 
  TvProvider 
} from '../src/lib/services/paybill';
import { KyandaProvider } from '../src/lib/providers/kyanda/provider';
import { mapKyandaError } from '../src/lib/providers/kyanda/errors';

describe('Shared PayBill Service Handler (TV & Electricity)', () => {
  const originalEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      KYANDA_BASE_URL: 'http://sandbox.kyanda.io:3030',
      KYANDA_API_KEY: 'test-api-key',
      KYANDA_MERCHANT_ID: 'test-merchant',
      KYANDA_SECURITY_KEY: 'test-security-key',
    };
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Supported TV Providers', () => {
    it('contains exactly the 4 documented TV providers', () => {
      expect(SUPPORTED_TV_PROVIDERS).toEqual(['GOTV', 'DSTV', 'ZUKU', 'STARTIMES']);
    });
  });

  describe('vendTvSubscription Validation', () => {
    it('throws VALIDATION_ERROR if decoder number is empty', async () => {
      const provider = new KyandaProvider();
      const handler = new PayBillServiceHandler(provider);

      await expect(
        handler.vendTvSubscription({
          amount: 1050,
          decoderNumber: '   ',
          provider: 'DSTV',
          initiatorPhone: '0722647928',
        })
      ).rejects.toMatchObject({
        category: 'VALIDATION_ERROR',
        message: 'Decoder / smartcard number is required.',
      });
    });

    it('throws VALIDATION_ERROR if provider is not supported', async () => {
      const provider = new KyandaProvider();
      const handler = new PayBillServiceHandler(provider);

      await expect(
        handler.vendTvSubscription({
          amount: 1000,
          decoderNumber: '1029384756',
          provider: 'NETFLIX',
          initiatorPhone: '0722647928',
        })
      ).rejects.toMatchObject({
        category: 'VALIDATION_ERROR',
        message: expect.stringContaining('Unsupported TV provider: \'NETFLIX\''),
      });
    });

    it('throws VALIDATION_ERROR if amount is 0 or negative', async () => {
      const provider = new KyandaProvider();
      const handler = new PayBillServiceHandler(provider);

      await expect(
        handler.vendTvSubscription({
          amount: 0,
          decoderNumber: '1029384756',
          provider: 'GOTV',
          initiatorPhone: '0722647928',
        })
      ).rejects.toMatchObject({
        category: 'VALIDATION_ERROR',
        message: 'A valid payment amount greater than 0 is required.',
      });
    });
  });

  describe('vendTvSubscription Successful Dispatch', () => {
    const testCases: { provider: TvProvider; amount: number; decoder: string }[] = [
      { provider: 'GOTV', amount: 650, decoder: '2019283746' },
      { provider: 'DSTV', amount: 1600, decoder: '1029384756' },
      { provider: 'ZUKU', amount: 1500, decoder: '3049586721' },
      { provider: 'STARTIMES', amount: 600, decoder: '0192837465' },
    ];

    testCases.forEach(({ provider: tvProvider, amount, decoder }) => {
      it(`dispatches ${tvProvider} Pay Bill with confirmed telco and account field`, async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'Success',
            status_code: '0000',
            merchant_reference: `KY-TV-${tvProvider}-001`,
            transactionId: `TX-${tvProvider}-123`,
            transactiontxt: 'Your request has been posted successfully!',
          }),
        } as Response);

        const provider = new KyandaProvider();
        const handler = new PayBillServiceHandler(provider);

        const result = await handler.vendTvSubscription({
          amount,
          decoderNumber: decoder,
          provider: tvProvider,
          initiatorPhone: '0722647928',
        });

        expect(result.merchant_reference).toBe(`KY-TV-${tvProvider}-001`);

        // Verify request payload shape sent to Kyanda Pay Bill API
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toContain('/billing/v1/bill/create');
        const init = fetchCall[1] as RequestInit;
        const body = JSON.parse(init.body as string) as Record<string, unknown>;

        expect(body.account).toBe(decoder);
        expect(body.amount).toBe(amount.toString());
        expect(body.telco).toBe(tvProvider);
        expect(body.initiatorPhone).toBe('0722647928');
        expect(body.MerchantID).toBe('test-merchant');
        expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('vendElectricity via Shared Handler', () => {
    it('correctly handles KPLC electricity vending through shared paybill', async () => {
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: '0000',
          merchant_reference: 'KY-ELEC-888',
          Token: '9999-8888-7777-6666-5555',
          Units: '28.4 kWh',
        }),
      } as Response);

      const provider = new KyandaProvider();
      const handler = new PayBillServiceHandler(provider);

      const result = await handler.vendElectricity({
        amount: 800,
        meterNumber: '14123456789',
        type: 'prepaid',
        initiatorPhone: '0722647928',
      });

      expect(result.merchant_reference).toBe('KY-ELEC-888');
      expect(result.token).toBe('9999-8888-7777-6666-5555');
      expect(result.units).toBe('28.4 kWh');
    });
  });

  describe('Pay Bill Error Handling & Code Mappings', () => {
    it('maps 8003 to PROVIDER_ERROR for invalid telco', () => {
      const err = mapKyandaError('8003');
      expect(err.category).toBe('PROVIDER_ERROR');
      expect(err.message).toContain('Telco');
    });

    it('maps 8001 to VALIDATION_ERROR for invalid account', () => {
      const err = mapKyandaError('8001');
      expect(err.category).toBe('VALIDATION_ERROR');
    });

    it('maps 1107 to INSUFFICIENT_FLOAT for float exhaustion', () => {
      const err = mapKyandaError('1107');
      expect(err.category).toBe('INSUFFICIENT_FLOAT');
    });
  });
});
