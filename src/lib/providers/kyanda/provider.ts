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
    const signature = KyandaSignatureEngine.generateAirtimeSignature(
      amount,
      phone,
      telco,
      initiatorPhone,
      merchantId,
      this.securityKey
    );

    const payload: any = {
      MerchantID: merchantId,
      phone,
      amount: String(amount),
      telco,
      initiatorPhone,
      signature,
      callbackURL: process.env.KYANDA_CALLBACK_URL
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
    const signature = KyandaSignatureEngine.generateBillSignature(
      amount,
      account,
      telco,
      initiatorPhone,
      merchantId,
      this.securityKey
    );

    const payload: any = {
      MerchantID: merchantId,
      account,
      amount: String(amount),
      telco,
      initiatorPhone,
      signature,
      callbackURL: process.env.KYANDA_CALLBACK_URL
    };

    return this.client.request<{ merchant_reference: string }>('/billing/v1/bill/create', payload);
  }
}
