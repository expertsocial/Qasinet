import crypto from 'crypto';

export class KyandaSignatureEngine {
  private static generateHmac(data: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
  }

  static generateAccountBalanceSignature(merchantId: string, securityKey: string): string {
    return this.generateHmac(merchantId, securityKey);
  }

  static generateTransactionCheckSignature(merchantId: string, transactionRef: string, securityKey: string): string {
    const data = `${merchantId}${transactionRef}`;
    return this.generateHmac(data, securityKey);
  }

  static generateAirtimeSignature(
    amount: string | number,
    phone: string,
    telco: string,
    initiatorPhone: string,
    merchantId: string,
    securityKey: string
  ): string {
    const data = `${amount}${phone}${telco}${initiatorPhone}${merchantId}`;
    return this.generateHmac(data, securityKey);
  }

  static generateBillSignature(
    amount: string | number,
    account: string,
    telco: string,
    initiatorPhone: string,
    merchantId: string,
    securityKey: string
  ): string {
    const data = `${amount}${account}${telco}${initiatorPhone}${merchantId}`;
    return this.generateHmac(data, securityKey);
  }

  static generateCheckoutSignature(
    amount: string | number,
    phoneNumber: string,
    channel: string,
    merchantId: string,
    securityKey: string
  ): string {
    const data = `${amount}${phoneNumber}${channel}${merchantId}`;
    return this.generateHmac(data, securityKey);
  }

  static generateB2BSignature(
    merchantId: string,
    channel: string,
    shortCode: string,
    identifier: string,
    amount: string | number,
    securityKey: string
  ): string {
    const data = `${merchantId}${channel}${shortCode}${identifier}${amount}`;
    return this.generateHmac(data, securityKey);
  }

  static generateBankPayoutSignature(
    amount: string | number,
    accountNumber: string,
    phoneNumber: string,
    bankCode: string,
    initiatorName: string,
    initiatorCountry: string,
    merchantId: string,
    securityKey: string
  ): string {
    const data = `${amount}${accountNumber}${phoneNumber}${bankCode}${initiatorName}${initiatorCountry}${merchantId}`;
    return this.generateHmac(data, securityKey);
  }

  static generateMobilePayoutSignature(
    amount: string | number,
    phone: string,
    initiatorName: string,
    initiatorCountry: string,
    channel: string,
    merchantId: string,
    securityKey: string
  ): string {
    const data = `${amount}${phone}${initiatorName}${initiatorCountry}${channel}${merchantId}`;
    return this.generateHmac(data, securityKey);
  }

  static verifyCallbackSignature(
    merchantId: string,
    transactionRef: string,
    status: string,
    signature: string,
    securityKey: string
  ): boolean {
    const data = `${merchantId}${transactionRef}${status}`;
    const expected = this.generateHmac(data, securityKey);
    return expected === signature;
  }
}
