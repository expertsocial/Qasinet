import { MpesaDarajaClient, MpesaStkPushPayload, MpesaStkPushResponse } from './client';

export class MpesaDarajaProvider {
  private client: MpesaDarajaClient;
  private passkey: string;
  private shortcode: string;
  private tillNumber: string;

  constructor() {
    this.client = new MpesaDarajaClient();
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.shortcode = process.env.MPESA_SHORTCODE || '';
    this.tillNumber = process.env.MPESA_TILL_NUMBER || this.shortcode;

    if (!this.passkey || !this.shortcode) {
      console.warn("MpesaDarajaProvider initialized without MPESA_PASSKEY or MPESA_SHORTCODE.");
    }
  }

  private generateTimestamp(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }

  private generatePassword(timestamp: string): string {
    return Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
  }

  private getCallbackUrl(): string {
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    }
    // Ensure we don't end up with double slashes
    const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBase}/api/webhooks/mpesa`;
  }

  /**
   * Initiates an STK Push to the customer's phone
   * @param phoneNumber Format must be 2547XXXXXXXX
   * @param amount 
   * @param accountReference Usually the transaction reference (e.g. QSN-XXX)
   * @param description Brief description of the payment
   */
  public async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    description: string
  ): Promise<MpesaStkPushResponse> {
    
    // Normalize phone number to 254 format if it starts with 0 or +254
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    // Handle 9-digit numbers like 712345678 or 112345678
    if (formattedPhone.length === 9 && (formattedPhone.startsWith('7') || formattedPhone.startsWith('1'))) {
      formattedPhone = '254' + formattedPhone;
    }

    if (amount <= 0 || isNaN(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    const timestamp = this.generateTimestamp();
    const password = this.generatePassword(timestamp);

    const payload: MpesaStkPushPayload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline", // Using CustomerBuyGoodsOnline because the user's shortcode is a Till Number
      Amount: Math.ceil(amount), // Daraja expects integers
      PartyA: formattedPhone,
      PartyB: this.tillNumber,
      PhoneNumber: formattedPhone,
      CallBackURL: this.getCallbackUrl(),
      AccountReference: accountReference.substring(0, 12), // Max 12 chars allowed by Daraja for AccountReference sometimes, but we'll substring to be safe
      TransactionDesc: description.substring(0, 13) // Max 13 chars
    };

    return this.client.request<MpesaStkPushResponse>('/mpesa/stkpush/v1/processrequest', payload);
  }
}
