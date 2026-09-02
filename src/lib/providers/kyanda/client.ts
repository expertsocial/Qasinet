import { QasiNetError } from '../../errors';
import { mapKyandaError } from './errors';

interface KyandaRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class KyandaClient {
  private baseUrl: string;
  private apiKey: string;
  private merchantId: string;
  private defaultTimeout = 10000;
  private maxRetries = 2;

  constructor() {
    this.baseUrl = process.env.KYANDA_BASE_URL || '';
    this.apiKey = process.env.KYANDA_API_KEY || '';
    this.merchantId = process.env.KYANDA_MERCHANT_ID || '';

    if (!this.baseUrl || !this.apiKey || !this.merchantId) {
      throw new Error('Kyanda configuration is missing required environment variables.');
    }
  }

  getMerchantId(): string {
    return this.merchantId;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private sanitizeLog(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    const sanitized = { ...data };
    if (sanitized.signature) sanitized.signature = '[REDACTED]';
    return sanitized;
  }

  async request<T>(endpoint: string, payload: any, options: KyandaRequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = this.generateRequestId();
    const retries = options.retries ?? this.maxRetries;
    const timeout = options.timeout ?? this.defaultTimeout;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`[KyandaClient] Request ${requestId} (Attempt ${attempt}): POST ${url}`, this.sanitizeLog(payload));

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apiKey': this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          ...options,
        });

        clearTimeout(id);

        if (!response.ok) {
          // If response is not ok (e.g. 500), we throw to trigger a retry
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log(`[KyandaClient] Response ${requestId}:`, responseData);

        // Check for application level errors
        if (responseData.status_code && responseData.status_code !== '0000' && responseData.status_code !== '1100') {
           throw mapKyandaError(responseData.status_code, responseData.transactiontxt || responseData.message, responseData);
        }

        return responseData as T;
      } catch (error: any) {
        if (error.isQasiNetError) {
          // Do not retry on validation/provider errors returned as HTTP 200 with error codes
           console.error(`[KyandaClient] Error ${requestId}:`, error.message);
           throw error;
        }

        const isTimeout = error.name === 'AbortError';
        const isLastAttempt = attempt === retries + 1;

        if (isLastAttempt) {
          console.error(`[KyandaClient] Failed ${requestId} after ${attempt} attempts.`, error.message);
          throw new QasiNetError(
            isTimeout ? 'TIMEOUT' : 'PROVIDER_ERROR',
            isTimeout ? 'Kyanda request timed out' : `Kyanda request failed: ${error.message}`,
            { endpoint, attempt }
          );
        }

        console.warn(`[KyandaClient] Retry ${requestId} (Attempt ${attempt}): ${error.message}`);
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    throw new Error('Unreachable code in KyandaClient');
  }
}
