export interface MpesaTokenResponse {
  access_token: string;
  expires_in: string;
}

export interface MpesaStkPushPayload {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaStkQueryPayload {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  CheckoutRequestID: string;
}

export interface MpesaStkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

// Module-level token cache and in-flight promise to eliminate duplicate auth handshakes across instances
let globalCachedToken: string | null = null;
let globalTokenExpiry: number = 0;
let globalTokenPromise: Promise<string> | null = null;

export class MpesaDarajaClient {
  private consumerKey: string;
  private consumerSecret: string;
  private isProduction: boolean;

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.isProduction = process.env.MPESA_ENVIRONMENT === 'production';
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async generateToken(): Promise<string> {
    if (globalCachedToken && Date.now() < globalTokenExpiry) {
      return globalCachedToken;
    }

    if (globalTokenPromise) {
      return globalTokenPromise;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error("Missing MPESA credentials (MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET)");
    }

    globalTokenPromise = (async () => {
      try {
        const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
        const url = `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

        let lastTokenError: any = null;
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${auth}`,
              },
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Daraja] Failed to generate token:", errorText);
              throw new Error(`Failed to generate Daraja token: ${response.status}`);
            }

            const data: MpesaTokenResponse = await response.json();
            globalCachedToken = data.access_token;
            // Daraja tokens typically expire in 3599 seconds. Cache for 50 minutes (3000 seconds)
            globalTokenExpiry = Date.now() + 3000 * 1000;

            return globalCachedToken;
          } catch (err: any) {
            lastTokenError = err;
            if (attempt < 2) {
              const backoff = (attempt + 1) * 1000;
              console.warn(`[Daraja] OAuth token fetch error (attempt ${attempt + 1}/3): ${err.message}. Retrying in ${backoff}ms...`);
              await new Promise(res => setTimeout(res, backoff));
              continue;
            }
          }
        }
        throw lastTokenError;
      } finally {
        globalTokenPromise = null;
      }
    })();

    return globalTokenPromise;
  }

  public async request<T>(endpoint: string, payload: any, maxRetries: number = 2): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = await this.generateToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          if (response.status === 401 && attempt < maxRetries) {
            console.warn('[Daraja] Token 401 unauthorized, invalidating cache and retrying...');
            globalCachedToken = null;
            globalTokenExpiry = 0;
            continue;
          }

          const errorText = await response.text();
          let parsedMessage = '';
          try {
            const errorJson = JSON.parse(errorText);
            parsedMessage = errorJson.errorMessage || errorJson.error_description || '';
          } catch (e) {
            // Not JSON
          }
          const detailedMessage = parsedMessage ? `Daraja API Error: ${parsedMessage}` : `Daraja API request failed with status: ${response.status}`;
          console.error(`[Daraja] API Error on ${endpoint}:`, detailedMessage, 'Raw:', errorText);
          throw new Error(detailedMessage);
        }

        return await response.json();
      } catch (err: any) {
        lastError = err;
        const isAbort = err.name === 'AbortError';
        const isNetwork = isAbort || err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.message?.includes('fetch failed') || err.message?.includes('timeout');

        if (attempt < maxRetries && isNetwork) {
          const backoff = (attempt + 1) * 1000;
          console.warn(`[Daraja] Network/timeout error on ${endpoint} (attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}. Retrying in ${backoff}ms...`);
          await new Promise(res => setTimeout(res, backoff));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError;
  }
}
