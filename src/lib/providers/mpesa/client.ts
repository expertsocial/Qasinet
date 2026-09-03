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

export class MpesaDarajaClient {
  private consumerKey: string;
  private consumerSecret: string;
  private isProduction: boolean;

  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

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
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error("Missing MPESA credentials (MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET)");
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const url = `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Daraja] Failed to generate token:", errorText);
      throw new Error(`Failed to generate Daraja token: ${response.status}`);
    }

    const data: MpesaTokenResponse = await response.json();
    this.cachedToken = data.access_token;
    // Daraja tokens typically expire in 3599 seconds. We'll cache for 50 minutes (3000 seconds)
    this.tokenExpiry = Date.now() + 3000 * 1000;

    return this.cachedToken;
  }

  public async request<T>(endpoint: string, payload: any): Promise<T> {
    const token = await this.generateToken();
    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
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

    return response.json();
  }
}
