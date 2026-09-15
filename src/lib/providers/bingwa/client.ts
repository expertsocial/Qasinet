import { QasiNetError } from '../../errors';
import { BingwaResellerPayload, BingwaResellerResponse } from './types';

export interface BingwaClientConfig {
  baseUrl?: string;
  defaultTill?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class BingwaClient {
  private readonly baseUrl: string;
  private readonly defaultTill: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config?: BingwaClientConfig) {
    this.baseUrl = config?.baseUrl || process.env.BINGWA_SOKONI_BASE_URL || 'https://bingwasoko.co.ke/api';
    this.defaultTill = config?.defaultTill || process.env.BINGWA_SOKONI_TILL || '509947';
    this.apiKey = config?.apiKey || process.env.BINGWA_SOKONI_API_KEY;
    this.timeoutMs = config?.timeoutMs || 15000;
    this.maxRetries = config?.maxRetries || 3;
  }

  public getDefaultTill(): string {
    return this.defaultTill;
  }

  /**
   * Dispatches a payment/vending request to the reseller endpoint
   */
  public async requestPay(payload: BingwaResellerPayload): Promise<BingwaResellerResponse> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/pay`;
    
    // Ensure till is populated
    const body: BingwaResellerPayload = {
      ...payload,
      till: payload.till || this.defaultTill,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['apiKey'] = this.apiKey;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let data: any;
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text, status: response.ok };
        }

        if (!response.ok) {
          // If server error, retry with backoff
          if (response.status >= 500 && attempt < this.maxRetries) {
            const delay = Math.pow(2, attempt) * 500;
            console.warn(`[ResellerClient] Server error ${response.status} on attempt ${attempt}/${this.maxRetries}. Retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          // Deterministic client errors (400, 401, 403, 422) - do not retry
          const errMsg = data?.message || data?.error || `Reseller API error (HTTP ${response.status})`;
          throw new QasiNetError('PROVIDER_ERROR', `Fulfillment provider error: ${errMsg}`);
        }

        return data as BingwaResellerResponse;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err instanceof QasiNetError) {
          throw err;
        }

        const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
        const isNetwork = err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED');

        if ((isAbort || isNetwork) && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          console.warn(`[ResellerClient] Network issue (${err.message}) on attempt ${attempt}/${this.maxRetries}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        break;
      }
    }

    throw new QasiNetError(
      'PROVIDER_ERROR',
      `Fulfillment provider connection failed: ${lastError?.message || 'Gateway unreachable'}`
    );
  }
}
