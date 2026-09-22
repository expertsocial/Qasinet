import { SupabaseClient } from '@supabase/supabase-js';
import { QasiNetError } from '../errors';
import { sendReceiptEmail, sendAdminRefundAlertEmail } from './email';
import { isServiceEnabled, getServiceById } from './registry';
import { getLiveServiceStatus } from './service-lock';

export type TransactionStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'VENDING_PENDING'
  | 'SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VENDING_FAILED'
  | 'VENDING_FAILED_REFUND_PENDING'
  | 'UNMATCHED_PAYMENT_MANUAL_REVIEW'
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

export interface PricingRule {
  is_active?: boolean;
  provider_cost_percentage?: number;
  provider_cost_fixed?: number;
  selling_price_percentage?: number;
  selling_price_fixed?: number;
  our_margin_percentage?: number;
  our_margin_fixed?: number;
}

export interface ServiceRecord {
  id: string;
  name: string;
  type: string;
  slug: string;
  provider_id: string;
  pricing?: PricingRule[];
}

export interface ProductRecord {
  id: string;
  provider_product_id?: string;
  pricing?: PricingRule[];
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

  public async logEvent(transactionId: string, status: TransactionStatus, details?: Record<string, unknown>) {
    let { error } = await this.supabase.from('transaction_events').insert({
      transaction_id: transactionId,
      status,
      details,
    });
    if (error && error.code === '22P02' && status === 'VENDING_FAILED_REFUND_PENDING') {
      const fallback = await this.supabase.from('transaction_events').insert({
        transaction_id: transactionId,
        status: 'VENDING_FAILED',
        details: { ...details, requested_status: 'VENDING_FAILED_REFUND_PENDING' },
      });
      error = fallback.error;
    }
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

    let service: ServiceRecord | null = null;
    let serviceError: { message?: string } | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await this.supabase
        .from('services')
        .select('id, name, type, slug, provider_id, pricing(*)')
        .eq('slug', params.serviceSlug)
        .eq('is_active', true)
        .single();
      service = res.data;
      serviceError = res.error;
      if (service) break;
      if (serviceError && attempt < 2) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (serviceError && !service) {
      console.error(`[Orchestrator] Failed to fetch service ${params.serviceSlug}:`, serviceError);
      throw new QasiNetError('SERVICE_UNAVAILABLE', 'Service lookup temporarily unavailable due to database connection issue. Please retry.');
    }

    if (!service) {
      throw new QasiNetError('VALIDATION_ERROR', 'Service not found or inactive');
    }

    // Enforce data bundle availability
    if (service.type === 'data') {
      const supportedDataServices = ['faiba-data', 'safaricom-data', 'airtel-data'];
      if (!supportedDataServices.includes(service.slug)) {
        throw new QasiNetError('SERVICE_UNAVAILABLE', 'Data bundles are currently supported for Safaricom, Airtel, and Faiba 4G');
      }
      if (service.slug === 'faiba-data' && !isServiceEnabled('faiba-data')) {
        throw new QasiNetError('SERVICE_UNAVAILABLE', 'Faiba data bundle vending is temporarily paused pending upstream provider activation. Please purchase Faiba Airtime instead.');
      }
    }

    // Enforce electricity token vending pause
    if (service.type === 'electricity' || service.slug === 'kplc-prepaid' || service.slug === 'kplc-postpaid') {
      if (!isServiceEnabled('kplc-prepaid') && !isServiceEnabled('kplc-postpaid')) {
        throw new QasiNetError('SERVICE_UNAVAILABLE', 'Kenya Power electricity token vending is temporarily paused pending gateway channel configuration. Purchases are suspended to protect customer funds.');
      }
      if (!isServiceEnabled(service.slug)) {
        throw new QasiNetError('SERVICE_UNAVAILABLE', `${service.name || 'Electricity'} vending is currently paused for maintenance.`);
      }
    }

    // Enforce live service status (DB-backed live toggle with static registry fallback)
    const regService = getServiceById(params.serviceSlug);
    if (regService) {
      const liveStatus = await getLiveServiceStatus(params.serviceSlug);
      if (liveStatus.status !== 'enabled') {
        throw new QasiNetError(
          'SERVICE_UNAVAILABLE',
          liveStatus.customerMessage || `${liveStatus.title} is currently unavailable or undergoing maintenance.`
        );
      }
    }

    let pricingRule = service.pricing?.[0];

    let productRecord: ProductRecord | null = null;
    let resolvedProductId: string | null = null;

    if (params.productId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.productId);
      let query = this.supabase
        .from('products')
        .select('id, provider_product_id, pricing(*)')
        .eq('service_id', service.id)
        .eq('is_active', true);

      if (isUuid) {
        query = query.eq('id', params.productId);
      } else {
        query = query.eq('provider_product_id', params.productId);
      }

      const { data: product, error: productError } = await query.maybeSingle();

      if (!productError && product) {
        productRecord = product;
        resolvedProductId = product.id;
        if (product.pricing && product.pricing.length > 0) {
          const activePricing = product.pricing.find((p: PricingRule) => p.is_active !== false);
          if (activePricing) pricingRule = activePricing;
        }
      } else if (isUuid) {
        throw new QasiNetError('VALIDATION_ERROR', 'Product not found or inactive');
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
        product_id: resolvedProductId,
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

    await this.logEvent(transaction.id, 'CREATED', { 
      message: 'Transaction initialized',
      ...(params.productId ? { productCode: productRecord?.provider_product_id || params.productId } : {})
    });

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

    const updatePayload: Record<string, unknown> = { status: newState };
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

    // Customer notification on payment failure (if customer has an email on file)
    if (newState === 'PAYMENT_FAILED') {
      this.dispatchCustomerNotification(transactionId, 'PAYMENT_FAILED', { reason: failureReason });
    }
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

  public async markVendingFailedRefundPending(
    transactionId: string,
    reason: string,
    providerRef?: string,
    metadata?: Record<string, unknown>
  ) {
    const refundDetails = {
      refund_required: true,
      refund_status: 'PENDING_REVIEW',
      reason,
      providerRef,
      ...(metadata || {})
    };

    console.warn(`[Orchestrator] Marking transaction ${transactionId} as VENDING_FAILED_REFUND_PENDING: ${reason}`);

    // Try setting status to VENDING_FAILED_REFUND_PENDING
    let { error } = await this.supabase
      .from('transactions')
      .update({
        status: 'VENDING_FAILED_REFUND_PENDING',
        failure_reason: `[REFUND_PENDING] ${reason}`,
        ...(providerRef ? { kyanda_reference: providerRef } : {})
      })
      .eq('id', transactionId);

    // If enum value does not exist yet on remote db before migration, fallback to VENDING_FAILED with flag
    if (error && error.code === '22P02') {
      console.warn('[Orchestrator] Enum VENDING_FAILED_REFUND_PENDING not in DB yet, falling back to VENDING_FAILED with [REFUND_PENDING] prefix.');
      const fallback = await this.supabase
        .from('transactions')
        .update({
          status: 'VENDING_FAILED',
          failure_reason: `[REFUND_PENDING] ${reason}`,
          ...(providerRef ? { kyanda_reference: providerRef } : {})
        })
        .eq('id', transactionId);
      error = fallback.error;
    }

    if (error) {
      console.error('Failed to update transaction to refund pending:', error.message);
      throw new QasiNetError('UNKNOWN', 'Failed to update transaction to refund pending');
    }

    await this.logEvent(transactionId, 'VENDING_FAILED_REFUND_PENDING', refundDetails);

    // Dual audience notifications:
    // 1. Customer notice (Refund Under Review) if customer has email on file
    this.dispatchCustomerNotification(transactionId, 'VENDING_FAILED_REFUND_PENDING', {
      reason,
      providerRef,
      metadata,
    });

    // 2. High-priority internal Admin alert (always sent so refunds are not delayed)
    this.dispatchAdminRefundAlert(transactionId, reason, providerRef, metadata);
  }

  public async finalizeTransaction(
    transactionId: string, 
    success: boolean, 
    reason?: string, 
    providerRef?: string,
    metadata?: Record<string, unknown>,
    overrideFailureState?: 'VENDING_FAILED' | 'VENDING_FAILED_REFUND_PENDING'
  ) {
    if (!success && overrideFailureState === 'VENDING_FAILED_REFUND_PENDING') {
      return this.markVendingFailedRefundPending(transactionId, reason || 'Vending failed, refund pending', providerRef, metadata);
    }

    const finalState = success ? 'SUCCESS' : 'VENDING_FAILED';
    
    const updatePayload: Record<string, unknown> = { status: finalState };
    if (reason !== undefined) updatePayload.failure_reason = reason;
    if (providerRef) updatePayload.kyanda_reference = providerRef;

    const { error: updateError } = await this.supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to finalize transaction:', updateError.message);
      throw new QasiNetError('UNKNOWN', 'Failed to finalize transaction');
    }

    await this.logEvent(transactionId, finalState, { 
      reason, 
      providerRef, 
      ...(metadata || {}) 
    });
    
    if (success) {
      const receiptNum = `RCPT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await this.supabase.from('receipts').insert({
        transaction_id: transactionId,
        receipt_number: receiptNum
      });

      // Automated Customer Receipt Dispatch
      this.dispatchCustomerNotification(transactionId, 'SUCCESS', { providerRef, metadata });
    } else {
      // If vending failed without refund pending override, notify customer and admin
      this.dispatchCustomerNotification(transactionId, 'VENDING_FAILED_REFUND_PENDING', { reason, providerRef, metadata });
      this.dispatchAdminRefundAlert(transactionId, reason, providerRef, metadata);
    }
  }

  /**
   * Helper: Dispatches customer-facing receipt / order confirmation email.
   * Completely fire-and-forget and non-blocking: skips silently if no email is on file.
   */
  private dispatchCustomerNotification(
    transactionId: string,
    status: 'SUCCESS' | 'VENDING_FAILED_REFUND_PENDING' | 'PAYMENT_FAILED',
    options?: {
      providerRef?: string;
      metadata?: Record<string, unknown>;
      reason?: string;
    }
  ): void {
    (async () => {
      try {
        const { data: txInfo } = await this.supabase
          .from('transactions')
          .select('qsn_reference, amount, destination, payment_reference, kyanda_reference, created_at, user_id, services(name, type)')
          .eq('id', transactionId)
          .single();

        if (!txInfo) return;

        let targetEmail: string | null = null;
        let customerName: string | undefined = undefined;

        // 1. Check registered user profile
        if (txInfo.user_id) {
          const { data: profile } = await this.supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', txInfo.user_id)
            .maybeSingle();

          if (profile?.email) {
            targetEmail = profile.email;
            customerName = profile.full_name;
          }
        }

        // 2. Check metadata for guest email
        if (!targetEmail && typeof options?.metadata?.email === 'string') {
          targetEmail = options.metadata.email;
        }

        // Skip silently if no email is on file
        if (!targetEmail) {
          return;
        }

        const rawServices = txInfo.services;
        const serviceObj = Array.isArray(rawServices) ? rawServices[0] : rawServices;
        const serviceName = (serviceObj as { name?: string } | null)?.name || 'Utility Service';
        const serviceType = (serviceObj as { type?: string } | null)?.type || undefined;

        await sendReceiptEmail({
          to: targetEmail,
          customerName,
          reference: txInfo.qsn_reference,
          amount: txInfo.amount,
          serviceName,
          serviceType,
          destination: txInfo.destination,
          paymentReference: txInfo.payment_reference,
          providerReference: options?.providerRef || txInfo.kyanda_reference,
          date: txInfo.created_at,
          token: typeof options?.metadata?.token === 'string' ? options.metadata.token : undefined,
          units: typeof options?.metadata?.units === 'string' || typeof options?.metadata?.units === 'number' ? options.metadata.units : undefined,
          accountName: typeof options?.metadata?.accountName === 'string' ? options.metadata.accountName : undefined,
          status,
          failureReason: options?.reason,
        });
      } catch (err: unknown) {
        console.error(`[Customer Email Dispatch Error - ${status}]:`, err instanceof Error ? err.message : err);
      }
    })();
  }

  /**
   * Helper: Dispatches internal admin alert email for VENDING_FAILED_REFUND_PENDING cases.
   * Completely fire-and-forget and non-blocking.
   */
  private dispatchAdminRefundAlert(
    transactionId: string,
    reason?: string,
    providerRef?: string,
    metadata?: Record<string, unknown>
  ): void {
    (async () => {
      try {
        const { data: txInfo } = await this.supabase
          .from('transactions')
          .select('qsn_reference, amount, destination, payment_reference, kyanda_reference, created_at, user_id, services(name, type)')
          .eq('id', transactionId)
          .single();

        if (!txInfo) return;

        let customerName: string | undefined = undefined;
        let customerEmail: string | undefined = undefined;

        if (txInfo.user_id) {
          const { data: profile } = await this.supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', txInfo.user_id)
            .maybeSingle();

          if (profile) {
            customerName = profile.full_name;
            customerEmail = profile.email || undefined;
          }
        }

        if (!customerEmail && typeof metadata?.email === 'string') {
          customerEmail = metadata.email;
        }

        const rawServices = txInfo.services;
        const serviceObj = Array.isArray(rawServices) ? rawServices[0] : rawServices;
        const serviceName = (serviceObj as { name?: string } | null)?.name || 'Utility Service';
        const serviceType = (serviceObj as { type?: string } | null)?.type || undefined;

        await sendAdminRefundAlertEmail({
          reference: txInfo.qsn_reference,
          amount: txInfo.amount,
          serviceName,
          serviceType,
          destination: txInfo.destination,
          paymentReference: txInfo.payment_reference,
          providerReference: providerRef || txInfo.kyanda_reference,
          failureReason: reason,
          date: txInfo.created_at,
          customerName,
          customerEmail,
        });
      } catch (err: unknown) {
        console.error('[Admin Refund Alert Email Error]:', err instanceof Error ? err.message : err);
      }
    })();
  }
}

