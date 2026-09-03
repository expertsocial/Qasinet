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

export class PaymentService {
  /**
   * Generates a unique idempotency key for the order
   */
  static generateIdempotencyKey(): string {
    return `idk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Initiates the payment process by calling our backend API.
   */
  static async initiatePayment(order: OrderPayload, idempotencyKey: string): Promise<PaymentInitResult> {
    const payload = {
      serviceSlug: order.serviceId,
      // If order.metadata.productId exists use it, otherwise undefined
      productId: order.metadata?.productId || undefined,
      destination: order.destination,
      amount: order.amount,
      guestPhone: order.paymentPhone
    };

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = 'Failed to initiate payment';
      if (typeof errorData.error === 'object' && errorData.error !== null) {
        errorMessage = errorData.error.message || errorMessage;
      } else if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      reference: data.transaction.reference,
      idempotencyKey,
    };
  }

  /**
   * Polls the backend for payment/vending status.
   */
  static async checkStatus(reference: string, attempt: number): Promise<PaymentStatusResult> {
    const response = await fetch(`/api/transactions/${reference}/status`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }

    const data = await response.json();
    
    // Map the database status to the frontend PaymentState
    const dbState = data.state;
    let paymentState: PaymentState = "UNKNOWN";

    switch (dbState) {
      case 'CREATED':
      case 'PAYMENT_PENDING':
        paymentState = "PENDING";
        break;
      case 'PAYMENT_CONFIRMED':
        paymentState = "CONFIRMED";
        break;
      case 'VENDING_PENDING':
        paymentState = "PROCESSING";
        break;
      case 'SUCCESS':
        paymentState = "SUCCESS";
        break;
      case 'PAYMENT_FAILED':
      case 'VENDING_FAILED':
      case 'REVERSED':
        paymentState = "FAILED";
        break;
      case 'TIMEOUT':
        paymentState = "TIMEOUT";
        break;
      default:
        paymentState = "UNKNOWN";
    }

    return { 
      state: paymentState,
      providerRef: data.providerRef,
      receiptData: data.receiptData
    };
  }
}
