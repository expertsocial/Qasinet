export interface Transaction {
  id: string;
  reference: string;
  service: string;
  customer: string;
  amount: number;
  provider: string;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED' | 'VENDING_PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

export interface ProviderResponse {
  success: boolean;
  reference?: string;
  message: string;
  rawResponse?: any;
}
