import { ProviderResponse } from "@/types";

export interface VendingProvider {
  /**
   * Buy airtime for a given phone number
   */
  buyAirtime(phoneNumber: string, amount: number, network: string): Promise<ProviderResponse>;

  /**
   * Verify an account (e.g. DStv, KPLC) before vending
   */
  verifyAccount(accountNumber: string, service: string): Promise<any>;

  /**
   * Pay utility or TV subscription
   */
  payBill(accountNumber: string, amount: number, service: string, phoneNumber?: string): Promise<ProviderResponse>;

  /**
   * Check transaction status with the provider
   */
  checkTransactionStatus(reference: string): Promise<ProviderResponse>;
}
