import { ProviderResponse } from "@/types";
import { VendingProvider } from "./VendingProvider";
import { generateKyandaSignature } from "@/lib/kyanda/signature";

export class KyandaProvider implements VendingProvider {
  private baseUrl: string;
  private apiKey: string;
  private merchantId: string;
  private securityKey: string;

  constructor() {
    this.baseUrl = process.env.KYANDA_BASE_URL || "";
    this.apiKey = process.env.KYANDA_API_KEY || "";
    this.merchantId = process.env.KYANDA_MERCHANT_ID || "";
    this.securityKey = process.env.KYANDA_SECURITY_KEY || "";
    
    if (!this.baseUrl || !this.apiKey || !this.merchantId || !this.securityKey) {
      console.warn("KyandaProvider initialized without complete credentials in environment.");
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "apiKey": this.apiKey,
    };
  }

  async buyAirtime(phoneNumber: string, amount: number, network: string): Promise<ProviderResponse> {
    try {
      // Note: Actual endpoints and param structures depend on Kyanda docs
      // This is a structural implementation for Phase 1A.
      const reference = `QSN-AIR-${Date.now()}`;
      
      // Concat logic for Airtime (Example, must match docs in real implementation)
      const signatureStr = `${this.merchantId}${reference}${phoneNumber}${amount}`;
      const signature = generateKyandaSignature(signatureStr, this.securityKey);

      // We are stubbing the actual fetch for the architectural phase
      // to ensure we don't hit live endpoints with fake credentials
      console.log(`[KyandaProvider] buyAirtime - Phone: ${phoneNumber}, Amount: ${amount}, Network: ${network}`);
      
      return {
        success: true,
        reference,
        message: "Airtime vending initiated",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to process airtime",
      };
    }
  }

  async verifyAccount(accountNumber: string, service: string): Promise<any> {
    console.log(`[KyandaProvider] verifyAccount - Account: ${accountNumber}, Service: ${service}`);
    return {
      valid: true,
      name: "Test Customer",
    };
  }

  async payBill(accountNumber: string, amount: number, service: string, phoneNumber?: string): Promise<ProviderResponse> {
    try {
      const reference = `QSN-BILL-${Date.now()}`;
      console.log(`[KyandaProvider] payBill - Account: ${accountNumber}, Amount: ${amount}, Service: ${service}`);
      
      return {
        success: true,
        reference,
        message: "Bill payment initiated",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to process bill payment",
      };
    }
  }

  async checkTransactionStatus(reference: string): Promise<ProviderResponse> {
    try {
      const signatureStr = `${this.merchantId}${reference}`;
      const signature = generateKyandaSignature(signatureStr, this.securityKey);
      
      console.log(`[KyandaProvider] checkTransactionStatus - Ref: ${reference}`);
      
      return {
        success: true,
        reference,
        message: "Transaction status retrieved",
        rawResponse: { status: "Success" }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to check status",
      };
    }
  }
}
