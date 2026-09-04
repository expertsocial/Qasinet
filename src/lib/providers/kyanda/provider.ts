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
    const cleanAmount = String(Math.round(Number(amount)));

    const signature = KyandaSignatureEngine.generateAirtimeSignature(
      cleanAmount,
      formattedPhone,
      formattedTelco,
      formattedInitiator,
      merchantId,
      this.securityKey
    );

    // Kyanda /billing/v1/airtime/create strictly accepts:
    // MerchantID, phone, amount, telco, initiatorPhone, signature.
    // callbackURL is an excess parameter and MUST NOT be sent here (it is registered via API/dashboard).
    const payload: any = {
      MerchantID: merchantId,
      phone: formattedPhone,
      amount: cleanAmount,
      telco: formattedTelco,
      initiatorPhone: formattedInitiator,
      signature
    };

    // productCode is strictly ONLY accepted for FAIBA_B (Faiba bundle packages).
    // Sending productCode for SAFARICOM, AIRTEL, TELKOM, EQUITEL causes HTTP 400 Missing/Excess parameters.
    if (formattedTelco === 'FAIBA_B' && productCode) {
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
    const cleanAmount = String(Math.round(Number(amount)));

    const signature = KyandaSignatureEngine.generateBillSignature(
      cleanAmount,
      account,
      formattedTelco,
      formattedInitiator,
      merchantId,
      this.securityKey
    );

    // Kyanda /billing/v1/bill/create strictly accepts:
    // MerchantID, account, amount, telco, initiatorPhone, signature.
    // callbackURL is NOT an accepted parameter in the request body.
    const payload: any = {
      MerchantID: merchantId,
      account,
      amount: cleanAmount,
      telco: formattedTelco,
      initiatorPhone: formattedInitiator,
      signature
    };

    return this.client.request<{ merchant_reference: string }>('/billing/v1/bill/create', payload);
  }

  async registerCallbackUrl(callbackUrl?: string): Promise<any> {
    const merchantId = this.client.getMerchantId();
    const targetUrl = callbackUrl || getSanitizedCallbackUrl();
    if (!targetUrl) {
      throw new Error('Callback URL is required to register with Kyanda.');
    }

    const signature = KyandaSignatureEngine.generateAccountBalanceSignature(merchantId, this.securityKey);
    const payload = {
      MerchantID: merchantId,
      callbackURL: targetUrl,
      signature
    };

    return this.client.request<any>('/billing/v1/callback-url/create', payload);
  }

  async verifyAccount(
    account: string,
    telco: string
  ): Promise<{ valid: boolean; customerName?: string; balance?: number; message?: string; rawResponse?: any }> {
    const merchantId = this.client.getMerchantId();
    const formattedTelco = (telco || 'KPLC_PREPAID').toUpperCase();
    const cleanAccount = account.trim();

    const signature = KyandaSignatureEngine.generateAccountQuerySignature(
      cleanAccount,
      formattedTelco,
      merchantId,
      this.securityKey
    );

    const payload = {
      MerchantID: merchantId,
      account: cleanAccount,
      telco: formattedTelco,
      signature
    };

    try {
      const response = await this.client.request<any>('/billing/v1/account-query', payload);
      
      const name = 
        response.customer_name || 
        response.name || 
        response.CustomerName || 
        response.AccountName || 
        response.account_name ||
        response.details?.name || 
        response.details?.customer_name ||
        response.details?.CustomerName ||
        response.details?.account_name;

      const balance = response.balance || response.amount_due || response.due_amount || response.details?.balance || 0;
      const statusCode = response.status_code || response.status || response.details?.status_code;

      const isSuccess = Boolean(name) || statusCode === '0000' || statusCode === '1100' || response.status === 'success';

      if (!isSuccess && !name) {
        const errorMsg = response.transactiontxt || response.message || response.error || 'Account not found';
        return {
          valid: false,
          message: errorMsg,
          rawResponse: response
        };
      }

      return {
        valid: true,
        customerName: name || 'Verified Account Holder',
        balance: Number(balance) || 0,
        rawResponse: response
      };
    } catch (error: any) {
      console.warn(`[KyandaProvider] verifyAccount failed for ${cleanAccount} (${formattedTelco}):`, error.message);
      
      // If error specifically states account not found or invalid account
      const errMsg = error.message || '';
      return {
        valid: false,
        message: errMsg.includes('HTTP Error') ? 'Account or meter number not found' : errMsg,
        rawResponse: { error: error.message }
      };
    }
  }
}


