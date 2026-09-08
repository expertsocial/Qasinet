/**
 * Unified Transaction Feedback Copy & Categorization Engine
 * 
 * Replaces technical, dev-console error dumps with warm, human-toned,
 * and actionable messaging across all transaction states.
 */

import { PaymentState, OrderPayload } from "@/lib/payment";

export type FeedbackSeverity = 'success' | 'pending' | 'refund' | 'error' | 'warning';

export interface ActionableFeedback {
  category: string;
  severity: FeedbackSeverity;
  headline: string;
  context: string;
  nextStepGuidance: string;
  badgeLabel: string;
  showRetry: boolean;
  retryLabel?: string;
  showSupport: boolean;
  isRefundPending: boolean;
  reference?: string;
}

interface FeedbackOptions {
  status: PaymentState | string;
  message?: string;
  order?: Partial<OrderPayload>;
  reference?: string;
  providerRef?: string;
}

/**
 * Maps raw backend statuses and error strings into customer-first feedback models.
 */
export function getTransactionFeedback(options: FeedbackOptions): ActionableFeedback {
  const feedback = resolveFeedback(options);
  if (options.reference) {
    feedback.reference = options.reference;
  }
  return feedback;
}

function resolveFeedback({
  status,
  message = '',
  order,
  reference,
}: FeedbackOptions): ActionableFeedback {
  const normMsg = (message || '').toLowerCase();
  const normStatus = (status || '').toUpperCase();

  // 1. SUCCESS
  if (normStatus === 'SUCCESS') {
    const serviceName = order?.serviceName || 'Utility service';
    const destination = order?.destination ? `to ${order.destination}` : '';
    const amountStr = order?.amount ? ` of KES ${order.amount.toLocaleString()}` : '';

    return {
      category: 'SUCCESS',
      severity: 'success',
      headline: 'Payment & Vending Complete',
      context: `Your ${serviceName}${amountStr} was successfully credited ${destination}.`,
      nextStepGuidance: 'Your official receipt has been generated below for your records.',
      badgeLabel: 'Paid & Delivered',
      showRetry: false,
      showSupport: false,
      isRefundPending: false,
    };
  }

  // 2. REFUND PENDING (Payment was received via M-Pesa, but provider vending failed)
  // This is the most crucial state to get right — reassure the customer their money is safe.
  const isRefund = 
    normStatus === 'REFUND_PENDING' ||
    normStatus === 'VENDING_FAILED_REFUND_PENDING' ||
    normMsg.includes('refund_pending') ||
    normMsg.includes('refund') ||
    (normMsg.includes('float') && normStatus.includes('VENDING'));

  if (isRefund) {
    const amountStr = order?.amount ? `Payment of KES ${order.amount.toLocaleString()} was received` : 'We received your M-Pesa payment';
    const serviceName = order?.serviceName ? ` for ${order.serviceName}` : '';
    return {
      category: 'REFUND_PENDING',
      severity: 'refund',
      headline: 'Payment Received — Automatic Refund in Progress',
      context: `${amountStr}${serviceName}, but the utility could not be delivered by the provider at this time.`,
      nextStepGuidance: 'Your funds are completely safe. No action is needed on your end — your refund will be returned to your M-Pesa account automatically within 2 to 4 hours. You can quote your reference below with support if you have questions.',
      badgeLabel: 'Refund In Progress',
      showRetry: false,
      showSupport: true,
      isRefundPending: true,
    };
  }

  // 3. PENDING & PROCESSING STATES
  if (normStatus === 'PENDING' || normStatus === 'CREATED' || normStatus === 'PAYMENT_PENDING') {
    return {
      category: 'PAYMENT_PENDING',
      severity: 'pending',
      headline: 'Awaiting M-Pesa PIN',
      context: 'An STK prompt has been dispatched to your handset. Please check your screen and enter your M-Pesa PIN.',
      nextStepGuidance: 'Keep this screen open — your utility will be credited automatically as soon as payment is confirmed.',
      badgeLabel: 'Awaiting PIN',
      showRetry: false,
      showSupport: false,
      isRefundPending: false,
    };
  }

  if (normStatus === 'CONFIRMED' || normStatus === 'PAYMENT_CONFIRMED') {
    return {
      category: 'PAYMENT_CONFIRMED',
      severity: 'pending',
      headline: 'Payment Confirmed',
      context: 'We verified your M-Pesa payment. Preparing to dispatch your order to the utility provider.',
      nextStepGuidance: 'Finalizing token generation and account clearance...',
      badgeLabel: 'Payment Received',
      showRetry: false,
      showSupport: false,
      isRefundPending: false,
    };
  }

  if (normStatus === 'PROCESSING' || normStatus === 'VENDING_PENDING') {
    return {
      category: 'VENDING_PROCESSING',
      severity: 'pending',
      headline: 'Generating Utility Token',
      context: 'Communicating with the telco gateway to dispatch your airtime, tokens, or subscription.',
      nextStepGuidance: 'Hold tight — this usually completes in less than 5 seconds.',
      badgeLabel: 'Vending Utility',
      showRetry: false,
      showSupport: false,
      isRefundPending: false,
    };
  }

  // 4. TIMEOUT (Payment confirmation or provider response timed out)
  if (normStatus === 'TIMEOUT') {
    return {
      category: 'TIMEOUT',
      severity: 'warning',
      headline: 'Verification Taking a Little Longer',
      context: 'We have not received the final acknowledgement from the provider network yet.',
      nextStepGuidance: 'If your M-Pesa account was charged, your utility will be delivered automatically. You can track this anytime with your reference number.',
      badgeLabel: 'Verification Delayed',
      showRetry: false,
      showSupport: true,
      isRefundPending: false,
    };
  }

  // 5. INSUFFICIENT FLOAT / SERVICE UNAVAILABLE
  if (
    normMsg.includes('float') ||
    normMsg.includes('service_unavailable') ||
    normMsg.includes('temporarily unavailable') ||
    normMsg.includes('gateway balance') ||
    normMsg.includes('insufficient funds')
  ) {
    return {
      category: 'SERVICE_UNAVAILABLE',
      severity: 'error',
      headline: 'Service Temporarily Paused',
      context: 'We are currently unable to connect to the provider network. No funds have been deducted from your account.',
      nextStepGuidance: 'Our engineers are on it. Please check back in a few minutes or choose an alternative network service.',
      badgeLabel: 'Temporarily Paused',
      showRetry: true,
      retryLabel: 'Try Again',
      showSupport: true,
      isRefundPending: false,
    };
  }

  // 6. VALIDATION ERROR (Bad phone, account, meter, or amount)
  if (
    normMsg.includes('validation') ||
    normMsg.includes('invalid') ||
    normMsg.includes('phone number') ||
    normMsg.includes('meter') ||
    normMsg.includes('account') ||
    normMsg.includes('minimum') ||
    normMsg.includes('maximum')
  ) {
    let specificContext = 'One of the details entered could not be verified by the utility provider.';
    if (normMsg.includes('phone')) {
      specificContext = 'The phone number provided does not appear to be a valid Kenyan mobile number.';
    } else if (normMsg.includes('meter')) {
      specificContext = 'The electricity meter number could not be found or verified by Kenya Power.';
    } else if (normMsg.includes('account')) {
      specificContext = 'The utility account number could not be recognized by the service provider.';
    } else if (normMsg.includes('amount')) {
      specificContext = 'The purchase amount is outside the allowable limits for this service.';
    }

    return {
      category: 'VALIDATION_ERROR',
      severity: 'error',
      headline: 'Please Double-Check Your Details',
      context: specificContext,
      nextStepGuidance: 'Review your account or phone number above and submit again.',
      badgeLabel: 'Check Details',
      showRetry: true,
      retryLabel: 'Edit & Try Again',
      showSupport: false,
      isRefundPending: false,
    };
  }

  // 7. DUPLICATE TRANSMISSION
  if (normMsg.includes('duplicate') || normMsg.includes('already processed') || normMsg.includes('in progress')) {
    return {
      category: 'DUPLICATE_REQUEST',
      severity: 'warning',
      headline: 'Order Already in Motion',
      context: 'A payment for this exact transaction was already initiated moments ago.',
      nextStepGuidance: 'Please wait a minute before re-ordering to ensure you are not debited twice for the same utility.',
      badgeLabel: 'Already In Progress',
      showRetry: false,
      showSupport: true,
      isRefundPending: false,
    };
  }

  // 8. PAYMENT FAILED / CANCELLED ON M-PESA
  if (
    normMsg.includes('cancelled') ||
    normMsg.includes('pin') ||
    normMsg.includes('1032') ||
    normMsg.includes('1037') ||
    normMsg.includes('user cancelled') ||
    normMsg.includes('stk') ||
    normMsg.includes('declined')
  ) {
    return {
      category: 'PAYMENT_CANCELLED',
      severity: 'error',
      headline: 'M-Pesa Payment Not Completed',
      context: 'The M-Pesa payment prompt was cancelled or timed out on your phone. No money was deducted.',
      nextStepGuidance: 'You can retry the checkout prompt immediately or enter an alternative M-Pesa phone number.',
      badgeLabel: 'Payment Incomplete',
      showRetry: true,
      retryLabel: 'Send M-Pesa Prompt Again',
      showSupport: false,
      isRefundPending: false,
    };
  }

  // 9. GENERAL PROVIDER / UNKNOWN ERROR FALLBACK
  return {
    category: 'PROVIDER_ERROR',
    severity: 'error',
    headline: 'Could Not Complete Vending',
    context: 'The utility provider experienced a momentary connection interruption while fulfilling your order.',
    nextStepGuidance: 'If your M-Pesa was debited, your money is completely safe and will be refunded or fulfilled shortly. Quote your reference below with support if needed.',
    badgeLabel: 'Vending Interrupted',
    showRetry: true,
    retryLabel: 'Try Again',
    showSupport: true,
    isRefundPending: false,
  };
}
