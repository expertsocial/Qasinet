import { KyandaClient } from './client';
import { KyandaSignatureEngine } from './signature';

export interface KyandaAccountBalanceResponse {
  Account_Bal: number;
  Earnings_Bal: number;
}

export interface KyandaTransactionStatusResponse {
  status: string;
  details: {
    Amount: string;
    Phone: string;
    Posted_Time: string;
    Status: string;
    Telco: string;
    timestamp: number;
  };
}

export function formatKyandaPhone(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

function getSanitizedCallbackUrl(): string | undefined {
  let url = process.env.KYANDA_CALLBACK_URL;
  if (!url) return undefined;
  if (url.startsWith('https:https://')) {
    url = url.replace('https:https://', 'https://');
  } else if (url.startsWith('http:http://')) {
    url = url.replace('http:http://', 'http://');
  }
  return url;
}

export class KyandaProvider {
  private client: KyandaClient;
  private securityKey: string;

  constructor() {
    this.client = new KyandaClient();
    this.securityKey = process.env.KYANDA_SECURITY_KEY || '';

    if (!this.securityKey) {
      throw new Error('Kyanda configuration is missing KYANDA_SECURITY_KEY.');
    }
  }

  async checkAccountBalance(): Promise<KyandaAccountBalanceResponse> {
    const merchantId = this.client.getMerchantId();
    const signature = KyandaSignatureEngine.generateAccountBalanceSignature(merchantId, this.securityKey);

    const payload = {
      MerchantID: merchantId,
      signature: signature,
    };

    return this.client.request<KyandaAccountBalanceResponse>('/billing/v1/account-balance', payload);
  }

  async checkTransactionStatus(transactionRef: string): Promise<KyandaTransactionStatusResponse> {
    const merchantId = this.client.getMerchantId();
    const signature = KyandaSignatureEngine.generateTransactionCheckSignature(merchantId, transactionRef, this.securityKey);

    const payload = {
      MerchantID: merchantId,
      transactionRef: transactionRef,
      signature: signature,
    };

    return this.client.request<KyandaTransactionStatusResponse>('/billing/v1/transaction-check', payload);
  }

  async buyAirtime(
    amount: number | string,
    phone: string,
    telco: string,
    initiatorPhone: string,
    productCode?: string
  ): Promise<{ merchant_reference: string }> {
    const merchantId = this.client.getMerchantId();
    const formattedPhone = formatKyandaPhone(phone);
    const formattedInitiator = formatKyandaPhone(initiatorPhone);
    const formattedTelco = (telco || 'SAFARICOM').toUpperCase();

    const signature = KyandaSignatureEngine.generateAirtimeSignature(
      amount,
      formattedPhone,
      formattedTelco,
      formattedInitiator,
      merchantId,
      this.securityKey
    );

    const payload: any = {
      MerchantID: merchantId,
      phone: formattedPhone,
      amount: String(amount),
      telco: formattedTelco,
      initiatorPhone: formattedInitiator,
      signature,
      callbackURL: getSanitizedCallbackUrl()
    };

    if (productCode) {
      payload.productCode = productCode;
    }

    return this.client.request<{ merchant_reference: string }>('/billing/v1/airtime/create', payload);
  }

  async payBill(
    amount: number | string,
    account: string,
    telco: string,
    initiatorPhone: string
  ): Promise<{ merchant_reference: string }> {
    const merchantId = this.client.getMerchantId();
    const formattedInitiator = formatKyandaPhone(initiatorPhone);
    const formattedTelco = (telco || 'SAFARICOM').toUpperCase();

    const signature = KyandaSignatureEngine.generateBillSignature(
      amount,
      account,
      formattedTelco,
      formattedInitiator,
      merchantId,
      this.securityKey
    );

    const payload: any = {
      MerchantID: merchantId,
      account,
      amount: String(amount),
      telco: formattedTelco,
      initiatorPhone: formattedInitiator,
      signature,
      callbackURL: getSanitizedCallbackUrl()
    };

    return this.client.request<{ merchant_reference: string }>('/billing/v1/bill/create', payload);
  }
}

