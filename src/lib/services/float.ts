import { KyandaProvider, KyandaAccountBalanceResponse } from '@/lib/providers/kyanda/provider';

export interface FloatCheckResult {
  sufficient: boolean;
  accountBalance: number | null;
  earningsBalance: number | null;
  orderAmount: number;
  buffer: number;
  requiredTotal: number;
  cached: boolean;
  fallbackUsed?: boolean;
  reason?: string;
  checkedAt: string;
}

interface CachedBalanceEntry {
  accountBalance: number;
  earningsBalance: number;
  timestamp: number;
}

export class FloatService {
  private _provider?: KyandaProvider;
  private cachedBalance: CachedBalanceEntry | null = null;

  constructor(provider?: KyandaProvider) {
    this._provider = provider;
  }

  private get provider(): KyandaProvider {
    if (!this._provider) {
      this._provider = new KyandaProvider();
    }
    return this._provider;
  }

  /**
   * Reads the current configuration from environment variables.
   */
  public getConfig() {
    const isEnabled = process.env.FLOAT_CHECK_ENABLED !== 'false';
    const isFailOpen = process.env.FLOAT_CHECK_FAIL_OPEN !== 'false';
    const minBuffer = Math.max(0, parseInt(process.env.MIN_FLOAT_BUFFER || '50', 10) || 50);
    const bufferPercent = Math.max(0, parseFloat(process.env.FLOAT_BUFFER_PERCENT || '5') || 0);
    const cacheTtlMs = Math.max(1000, parseInt(process.env.FLOAT_CACHE_TTL_MS || '45000', 10) || 45000);

    return {
      isEnabled,
      isFailOpen,
      minBuffer,
      bufferPercent,
      cacheTtlMs,
    };
  }

  /**
   * Calculates the effective safety buffer for a given transaction amount.
   * Uses the greater of the flat minimum buffer (e.g. 50 KES) or a percentage
   * of the order amount (e.g. 5% of a 6,000 KES order = 300 KES).
   */
  public getEffectiveBuffer(amount: number): number {
    const { minBuffer, bufferPercent } = this.getConfig();
    const percentBuffer = Math.round((amount * bufferPercent) / 100);
    return Math.max(minBuffer, percentBuffer);
  }

  /**
   * Retrieves the current float balance, using the in-memory cache if valid.
   * If bypassCache is true, a live network call is made and updates the shared cache.
   */
  public async getBalance(bypassCache = false): Promise<{ accountBalance: number; earningsBalance: number; cached: boolean }> {
    const { cacheTtlMs } = this.getConfig();
    const now = Date.now();

    if (!bypassCache && this.cachedBalance && (now - this.cachedBalance.timestamp) < cacheTtlMs) {
      return {
        accountBalance: this.cachedBalance.accountBalance,
        earningsBalance: this.cachedBalance.earningsBalance,
        cached: true,
      };
    }

    const response: KyandaAccountBalanceResponse = await this.provider.checkAccountBalance();
    
    const entry: CachedBalanceEntry = {
      accountBalance: Number(response.Account_Bal) || 0,
      earningsBalance: Number(response.Earnings_Bal) || 0,
      timestamp: now,
    };

    // Shared cache update: even uncached calls refresh the cache for subsequent checks
    this.cachedBalance = entry;

    return {
      accountBalance: entry.accountBalance,
      earningsBalance: entry.earningsBalance,
      cached: false,
    };
  }

  /**
   * Forces an immediate live network query to Kyanda and updates the shared cache.
   * Ideal for admin actions or manually triggered syncs.
   */
  public async refreshBalance(): Promise<{ accountBalance: number; earningsBalance: number; timestamp: number }> {
    const result = await this.getBalance(true);
    return {
      accountBalance: result.accountBalance,
      earningsBalance: result.earningsBalance,
      timestamp: this.cachedBalance?.timestamp || Date.now(),
    };
  }

  /**
   * Clears the in-memory cache (for testing or immediate invalidation).
   */
  public clearCache(): void {
    this.cachedBalance = null;
  }

  /**
   * Checks whether there is sufficient float balance to satisfy the order amount.
   *
   * Flow:
   * 1. If FLOAT_CHECK_ENABLED=false, emits a loud warning and returns sufficient=true.
   * 2. Computes the dynamic buffer (Math.max(minBuffer, percentBuffer)).
   * 3. Fetches balance (cached or live).
   * 4. Evaluates: Account_Bal >= (amount + buffer).
   * 5. If balance call fails, evaluates FLOAT_CHECK_FAIL_OPEN:
   *    - If true: logs prominent warning and allows checkout (relying on post-payment refund safety net).
   *    - If false: logs error and blocks checkout.
   */
  public async checkSufficientFloat(amount: number, options?: { bypassCache?: boolean }): Promise<FloatCheckResult> {
    const config = this.getConfig();
    const nowIso = new Date().toISOString();
    const buffer = this.getEffectiveBuffer(amount);
    const requiredTotal = amount + buffer;

    // Kill-switch verification: Log loudly when explicitly disabled
    if (!config.isEnabled) {
      console.warn(
        `[FloatService] ⚠️ WARNING: Float pre-check is GLOBALLY DISABLED via FLOAT_CHECK_ENABLED=false! ` +
        `Skipping balance check for order amount KES ${amount}. STK push will proceed unchecked.`
      );
      return {
        sufficient: true,
        accountBalance: null,
        earningsBalance: null,
        orderAmount: amount,
        buffer,
        requiredTotal,
        cached: false,
        fallbackUsed: true,
        reason: 'Float pre-check globally disabled via FLOAT_CHECK_ENABLED=false',
        checkedAt: nowIso,
      };
    }

    try {
      const balanceData = await this.getBalance(options?.bypassCache ?? false);
      const isSufficient = balanceData.accountBalance >= requiredTotal;

      if (!isSufficient) {
        return {
          sufficient: false,
          accountBalance: balanceData.accountBalance,
          earningsBalance: balanceData.earningsBalance,
          orderAmount: amount,
          buffer,
          requiredTotal,
          cached: balanceData.cached,
          reason: `Insufficient merchant float: balance ${balanceData.accountBalance} KES < required ${requiredTotal} KES (amount ${amount} + buffer ${buffer})`,
          checkedAt: nowIso,
        };
      }

      return {
        sufficient: true,
        accountBalance: balanceData.accountBalance,
        earningsBalance: balanceData.earningsBalance,
        orderAmount: amount,
        buffer,
        requiredTotal,
        cached: balanceData.cached,
        checkedAt: nowIso,
      };
    } catch (error: any) {
      const errorMsg = error?.message || 'Network / Kyanda balance API failure';

      if (config.isFailOpen) {
        console.warn(
          `[FloatService] ⚠️ WARNING: Kyanda balance check failed (${errorMsg}). ` +
          `FAIL-OPEN policy active (FLOAT_CHECK_FAIL_OPEN=true). Allowing STK push to proceed. ` +
          `Order will rely on post-payment VENDING_FAILED_REFUND_PENDING safety net if float is actually exhausted.`
        );

        return {
          sufficient: true,
          accountBalance: null,
          earningsBalance: null,
          orderAmount: amount,
          buffer,
          requiredTotal,
          cached: false,
          fallbackUsed: true,
          reason: `Fail-open fallback engaged after balance inquiry failure: ${errorMsg}`,
          checkedAt: nowIso,
        };
      }

      console.error(
        `[FloatService] 🛑 ERROR: Kyanda balance check failed (${errorMsg}). ` +
        `FAIL-CLOSED policy active (FLOAT_CHECK_FAIL_OPEN=false). Blocking STK push to protect against potential float shortfall.`
      );

      return {
        sufficient: false,
        accountBalance: null,
        earningsBalance: null,
        orderAmount: amount,
        buffer,
        requiredTotal,
        cached: false,
        fallbackUsed: true,
        reason: `Fail-closed policy blocked transaction after balance inquiry failure: ${errorMsg}`,
        checkedAt: nowIso,
      };
    }
  }
}

// Export singleton instance
export const floatService = new FloatService();
