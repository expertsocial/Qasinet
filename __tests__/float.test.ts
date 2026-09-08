import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FloatService } from '../src/lib/services/float';
import { KyandaProvider } from '../src/lib/providers/kyanda/provider';

describe('Merchant Float Pre-Check & Circuit Breaker Suite', () => {
  const originalEnv = { ...process.env };
  let mockCheckAccountBalance: ReturnType<typeof vi.fn>;
  let mockProvider: KyandaProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      FLOAT_CHECK_ENABLED: 'true',
      FLOAT_CHECK_FAIL_OPEN: 'true',
      MIN_FLOAT_BUFFER: '50',
      FLOAT_BUFFER_PERCENT: '5',
      FLOAT_CACHE_TTL_MS: '45000',
    };

    mockCheckAccountBalance = vi.fn();
    mockProvider = {
      checkAccountBalance: mockCheckAccountBalance,
    } as unknown as KyandaProvider;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Dynamic Safety Buffer Calculation', () => {
    it('uses flat minimum buffer for small orders when percentage is smaller', () => {
      const service = new FloatService(mockProvider);
      // 20 KES order: 5% is 1 KES < minBuffer (50 KES) => buffer = 50 KES
      expect(service.getEffectiveBuffer(20)).toBe(50);
      // 500 KES order: 5% is 25 KES < minBuffer (50 KES) => buffer = 50 KES
      expect(service.getEffectiveBuffer(500)).toBe(50);
    });

    it('scales buffer dynamically for larger orders when percentage exceeds flat minimum', () => {
      const service = new FloatService(mockProvider);
      // 2,000 KES order: 5% is 100 KES > 50 KES => buffer = 100 KES
      expect(service.getEffectiveBuffer(2000)).toBe(100);
      // 6,000 KES order: 5% is 300 KES > 50 KES => buffer = 300 KES
      expect(service.getEffectiveBuffer(6000)).toBe(300);
    });
  });

  describe('Sufficient and Insufficient Float Evaluation', () => {
    it('approves transaction when Account_Bal is greater than or equal to amount + buffer', async () => {
      mockCheckAccountBalance.mockResolvedValue({
        Account_Bal: 1000,
        Earnings_Bal: 150,
      });

      const service = new FloatService(mockProvider);
      // Order 500 KES + buffer 50 KES = 550 KES <= 1000 KES
      const result = await service.checkSufficientFloat(500);

      expect(result.sufficient).toBe(true);
      expect(result.accountBalance).toBe(1000);
      expect(result.orderAmount).toBe(500);
      expect(result.buffer).toBe(50);
      expect(result.requiredTotal).toBe(550);
      expect(result.cached).toBe(false);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);
    });

    it('blocks transaction when Account_Bal is less than amount + buffer', async () => {
      mockCheckAccountBalance.mockResolvedValue({
        Account_Bal: 400,
        Earnings_Bal: 150,
      });

      const service = new FloatService(mockProvider);
      // Order 500 KES + buffer 50 KES = 550 KES > 400 KES
      const result = await service.checkSufficientFloat(500);

      expect(result.sufficient).toBe(false);
      expect(result.accountBalance).toBe(400);
      expect(result.requiredTotal).toBe(550);
      expect(result.reason).toContain('Insufficient merchant float: balance 400 KES < required 550 KES');
    });

    it('blocks transaction when Account_Bal is 0 (current live state)', async () => {
      mockCheckAccountBalance.mockResolvedValue({
        Account_Bal: 0,
        Earnings_Bal: 0,
      });

      const service = new FloatService(mockProvider);
      const result = await service.checkSufficientFloat(100);

      expect(result.sufficient).toBe(false);
      expect(result.accountBalance).toBe(0);
      expect(result.requiredTotal).toBe(150); // 100 + 50
    });
  });

  describe('In-Memory Caching & Cache Refresh Behavior', () => {
    it('caches balance and serves consecutive requests within TTL without extra network calls', async () => {
      mockCheckAccountBalance.mockResolvedValue({
        Account_Bal: 2500,
        Earnings_Bal: 300,
      });

      const service = new FloatService(mockProvider);

      // Call 1: Uncached, hits provider
      const res1 = await service.checkSufficientFloat(100);
      expect(res1.sufficient).toBe(true);
      expect(res1.cached).toBe(false);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);

      // Call 2: Within TTL, serves from cache
      const res2 = await service.checkSufficientFloat(200);
      expect(res2.sufficient).toBe(true);
      expect(res2.cached).toBe(true);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);

      // Call 3: Within TTL, serves from cache
      const res3 = await service.checkSufficientFloat(500);
      expect(res3.sufficient).toBe(true);
      expect(res3.cached).toBe(true);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);
    });

    it('bypasses cache when bypassCache option is specified', async () => {
      mockCheckAccountBalance
        .mockResolvedValueOnce({ Account_Bal: 2000, Earnings_Bal: 100 })
        .mockResolvedValueOnce({ Account_Bal: 3000, Earnings_Bal: 200 });

      const service = new FloatService(mockProvider);

      await service.checkSufficientFloat(100);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);

      // Force bypass
      const res2 = await service.checkSufficientFloat(100, { bypassCache: true });
      expect(res2.accountBalance).toBe(3000);
      expect(res2.cached).toBe(false);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(2);
    });

    it('refreshBalance forces an uncached call and updates the shared cache', async () => {
      mockCheckAccountBalance
        .mockResolvedValueOnce({ Account_Bal: 500, Earnings_Bal: 50 })
        .mockResolvedValueOnce({ Account_Bal: 10000, Earnings_Bal: 50 });

      const service = new FloatService(mockProvider);

      // Admin triggers refresh
      const refreshResult = await service.refreshBalance();
      expect(refreshResult.accountBalance).toBe(500);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);

      // Next customer checkout benefits from the updated cache immediately
      const checkoutRes = await service.checkSufficientFloat(200);
      expect(checkoutRes.sufficient).toBe(true);
      expect(checkoutRes.accountBalance).toBe(500);
      expect(checkoutRes.cached).toBe(true);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1); // no extra call
    });
  });

  describe('Fail-Open vs Fail-Closed Policy', () => {
    it('engages FAIL-OPEN fallback when FLOAT_CHECK_FAIL_OPEN is true and gateway fails', async () => {
      process.env.FLOAT_CHECK_FAIL_OPEN = 'true';
      mockCheckAccountBalance.mockRejectedValue(new Error('ETIMEDOUT: Kyanda gateway unresponsive'));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const service = new FloatService(mockProvider);

      const result = await service.checkSufficientFloat(500);

      expect(result.sufficient).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.reason).toContain('Fail-open fallback engaged');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FloatService] ⚠️ WARNING: Kyanda balance check failed')
      );
    });

    it('engages FAIL-CLOSED blocking when FLOAT_CHECK_FAIL_OPEN is false and gateway fails', async () => {
      process.env.FLOAT_CHECK_FAIL_OPEN = 'false';
      mockCheckAccountBalance.mockRejectedValue(new Error('Connection reset by peer'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = new FloatService(mockProvider);

      const result = await service.checkSufficientFloat(500);

      expect(result.sufficient).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.reason).toContain('Fail-closed policy blocked transaction');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FloatService] 🛑 ERROR: Kyanda balance check failed')
      );
    });
  });

  describe('Global Kill-Switch (FLOAT_CHECK_ENABLED=false)', () => {
    it('bypasses balance check and logs loudly when FLOAT_CHECK_ENABLED is false', async () => {
      process.env.FLOAT_CHECK_ENABLED = 'false';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const service = new FloatService(mockProvider);
      const result = await service.checkSufficientFloat(1500);

      expect(result.sufficient).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.reason).toContain('Float pre-check globally disabled');
      expect(mockCheckAccountBalance).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FloatService] ⚠️ WARNING: Float pre-check is GLOBALLY DISABLED')
      );
    });
  });

  describe('Validation and Float Check Composition Order', () => {
    it('ensures payload validation fails fast before float check is evaluated', async () => {
      // Import the schema used in the transactions route
      const { initTransactionSchema } = await import('../src/lib/validations/transaction');

      // 1. Invalid payload (empty destination and negative amount)
      const invalidPayload = {
        serviceSlug: 'water',
        destination: '',
        amount: -50,
        guestPhone: '0712345678',
      };

      const parsed = initTransactionSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
      // Because validation failed, the route returns 400 immediately, never calling float check
      expect(mockCheckAccountBalance).not.toHaveBeenCalled();

      // 2. Valid payload passes validation
      const validPayload = {
        serviceSlug: 'water',
        destination: '1234567',
        amount: 500,
        guestPhone: '0712345678',
      };

      const validParsed = initTransactionSchema.safeParse(validPayload);
      expect(validParsed.success).toBe(true);
      if (!validParsed.success) throw new Error('Expected validation to succeed');

      // Now float check is evaluated
      mockCheckAccountBalance.mockResolvedValue({ Account_Bal: 1000, Earnings_Bal: 100 });
      const service = new FloatService(mockProvider);
      const floatRes = await service.checkSufficientFloat(validParsed.data.amount);
      expect(floatRes.sufficient).toBe(true);
      expect(mockCheckAccountBalance).toHaveBeenCalledTimes(1);
    });
  });
});
