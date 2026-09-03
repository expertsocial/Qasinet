import { SupabaseClient } from '@supabase/supabase-js';
import { QasiNetError } from '../errors';

export type TransactionStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'VENDING_PENDING'
  | 'SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VENDING_FAILED'
  | 'REVERSED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface InitTransactionParams {
  serviceSlug: string;
  productId?: string;
  destination: string;
  amount: number;
  guestPhone?: string;
  userId?: string;
  idempotencyKey: string;
}

export class TransactionOrchestrator {
  constructor(private readonly supabase: SupabaseClient) {}

  private generateQsnReference(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `QSN-${yyyy}${mm}${dd}-${randomStr}`;
  }

  private async logEvent(transactionId: string, status: TransactionStatus, details?: any) {
    const { error } = await this.supabase.from('transaction_events').insert({
      transaction_id: transactionId,
      status,
      details,
    });
    if (error) {
      console.error(`Failed to log event for TX ${transactionId}:`, error.message);
    }
  }

  public async initiateTransaction(params: InitTransactionParams) {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentTxs } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('destination', params.destination)
      .eq('amount', params.amount)
      .in('status', ['CREATED', 'PAYMENT_PENDING'])
      .gte('created_at', twoMinsAgo);

    if (recentTxs && recentTxs.length > 0) {
      throw new QasiNetError('DUPLICATE_REQUEST', 'A similar transaction is already in progress. Please wait.');
    }

    const { data: service, error: serviceError } = await this.supabase
      .from('services')
      .select('id, provider_id, pricing(*)')
      .eq('slug', params.serviceSlug)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      throw new QasiNetError('VALIDATION_ERROR', 'Service not found or inactive');
    }

    let pricingRule = service.pricing?.[0];

    if (params.productId) {
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('id, pricing(*)')
        .eq('id', params.productId)
        .eq('service_id', service.id)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new QasiNetError('VALIDATION_ERROR', 'Product not found or inactive');
      }
      if (product.pricing && product.pricing.length > 0) {
        pricingRule = product.pricing[0];
      }
    }

    if (!pricingRule) {
      throw new QasiNetError('SERVICE_UNAVAILABLE', 'Pricing configuration missing for this service');
    }

    let providerCost = 0;
    if (pricingRule.provider_cost_percentage) {
      providerCost = params.amount * (pricingRule.provider_cost_percentage / 100);
    } else if (pricingRule.provider_cost_fixed) {
      providerCost = pricingRule.provider_cost_fixed;
    }

    let sellingPrice = params.amount;
    if (pricingRule.selling_price_percentage) {
      sellingPrice = params.amount * (pricingRule.selling_price_percentage / 100);
    } else if (pricingRule.selling_price_fixed) {
      sellingPrice = params.amount + pricingRule.selling_price_fixed;
    }

    const profit = sellingPrice - providerCost;

    const qsnRef = this.generateQsnReference();
    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        qsn_reference: qsnRef,
        user_id: params.userId || null,
        guest_phone: params.userId ? null : params.guestPhone,
        service_id: service.id,
        product_id: params.productId || null,
        provider_id: service.provider_id,
        destination: params.destination,
        amount: params.amount,
        selling_price: sellingPrice,
        provider_cost: providerCost,
        profit,
        status: 'CREATED',
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error('Failed to initialize transaction:', txError?.message);
      throw new QasiNetError('UNKNOWN', 'Failed to initialize transaction');
    }

    await this.logEvent(transaction.id, 'CREATED', { message: 'Transaction initialized' });

    return transaction;
  }

  public async updatePaymentState(
    transactionId: string, 
    newState: 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED',
    paymentRef?: string,
    failureReason?: string
  ) {
    const { data: tx, error } = await this.supabase
      .from('transactions')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (error || !tx) {
      throw new QasiNetError('VALIDATION_ERROR', 'Transaction not found');
    }

    if (tx.status !== 'CREATED' && tx.status !== 'PAYMENT_PENDING') {
      throw new QasiNetError('VALIDATION_ERROR', `Cannot update payment from state: ${tx.status}`);
    }

    const updatePayload: any = { status: newState };
    if (paymentRef) {
      updatePayload.payment_reference = paymentRef;
    }
    if (failureReason) {
      updatePayload.failure_reason = failureReason;
    }

    const { error: updateError } = await this.supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to update transaction status:', updateError.message);
      throw new QasiNetError('UNKNOWN', 'Failed to update transaction status');
    }

    await this.logEvent(transactionId, newState, { paymentRef });
  }

  public async authorizeVending(transactionId: string) {
    const { data: tx, error } = await this.supabase
      .from('transactions')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (error || !tx) {
      throw new QasiNetError('VALIDATION_ERROR', 'Transaction not found');
    }

    if (tx.status !== 'PAYMENT_CONFIRMED') {
      throw new QasiNetError(
        'VALIDATION_ERROR', 
        `Vending rejected. Transaction payment state is ${tx.status}, expected PAYMENT_CONFIRMED.`
      );
    }

    const { error: updateError } = await this.supabase
      .from('transactions')
      .update({ status: 'VENDING_PENDING' })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to update to vending state:', updateError.message);
      throw new QasiNetError('UNKNOWN', 'Failed to update to vending state');
    }

    await this.logEvent(transactionId, 'VENDING_PENDING', { message: 'Vending authorized by payment success' });
  }

  public async finalizeTransaction(transactionId: string, success: boolean, reason?: string, providerRef?: string) {
    const finalState = success ? 'SUCCESS' : 'VENDING_FAILED';
    
    const updatePayload: any = { status: finalState };
    if (reason) updatePayload.failure_reason = reason;
    if (providerRef) updatePayload.kyanda_reference = providerRef;

    const { error: updateError } = await this.supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to finalize transaction:', updateError.message);
      throw new QasiNetError('UNKNOWN', 'Failed to finalize transaction');
    }

    await this.logEvent(transactionId, finalState, { reason, providerRef });
    
    if (success) {
      const receiptNum = `RCPT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await this.supabase.from('receipts').insert({
        transaction_id: transactionId,
        receipt_number: receiptNum
      });
    }
  }
}
