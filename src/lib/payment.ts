export type PaymentState = 
  | "IDLE"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "UNKNOWN";

export interface OrderPayload {
  serviceId: string;
  serviceName: string;
  provider: string;
  destination: string; // phone number, account number, meter number
  amount: number;
  fees: number;
  paymentPhone: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResult {
  reference: string;
  idempotencyKey: string;
}

export interface PaymentStatusResult {
  state: PaymentState;
  message?: string;
  providerRef?: string;
  receiptData?: any;
}

/**
 * Mock implementation of a Payment Service layer.
 * Prepares the architecture for the configured payment gateway.
 */
export class PaymentService {
  /**
   * Generates a unique idempotency key for the order
   */
  static generateIdempotencyKey(): string {
    return `idk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Initiates the payment process
   */
  static async initiatePayment(order: OrderPayload, idempotencyKey: string): Promise<PaymentInitResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate internal reference
    const reference = `QNT-${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`;

    return {
      reference,
      idempotencyKey,
    };
  }

  /**
   * Polls the backend for payment status.
   * In a real implementation, this checks our backend, not the payment gateway directly.
   */
  static async checkStatus(reference: string, attempt: number): Promise<PaymentStatusResult> {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate state progression based on attempt number
    if (attempt === 1) {
      return { state: "PENDING" }; // STK pushed
    }
    
    if (attempt === 2) {
      return { state: "CONFIRMED" }; // Customer entered PIN
    }

    if (attempt === 3) {
      return { state: "PROCESSING" }; // Vending the service
    }

    // Attempt 4: final resolution
    const rand = Math.random();
    if (rand > 0.15) {
      return { 
        state: "SUCCESS", 
        providerRef: `PRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        // Mock receipt data if applicable (e.g. Tokens)
        receiptData: {
          token: Array.from({length: 20}, () => Math.floor(Math.random() * 10)).join('')
        }
      };
    } else {
      return { 
        state: "FAILED", 
        message: "Insufficient funds or provider timeout."
      };
    }
  }
}
