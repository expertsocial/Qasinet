/**
 * Bingwa Sokoni Reseller Provider Types
 * 
 * Internal types for Option 1 (Reseller API) integration.
 * NOTE: Never expose vendor identifiers or internal till numbers in customer-facing UI or responses.
 */

export interface BingwaResellerPayload {
  till: string;
  amount: number;
  phone: string;
  bundle: string;
  callback_url?: string;
  reference?: string;
}

export interface BingwaResellerResponse {
  status: boolean | string;
  message?: string;
  transaction_id?: string;
  reference?: string;
  code?: number | string;
  [key: string]: any;
}

export interface BingwaWebhookPayload {
  status: string | boolean;
  transaction_id?: string;
  reference?: string;
  phone?: string;
  amount?: number;
  bundle?: string;
  message?: string;
  timestamp?: number | string;
  [key: string]: any;
}

export interface BundleDefinition {
  code: string;
  name: string;
  allowance: string;
  validity: string;
  price: number;
  telco: 'SAFARICOM' | 'AIRTEL';
  badge?: string;
  popular?: boolean;
  description?: string;
  category: 'daily' | 'weekly' | 'monthly' | 'voice_combo';
}
