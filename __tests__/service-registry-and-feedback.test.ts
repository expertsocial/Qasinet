import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  MASTER_SERVICES, 
  getServiceStatus, 
  getAllServices, 
  getVisibleServices, 
  getGroupedServices, 
  getServiceCategories, 
  isServiceEnabled 
} from '../src/lib/services/registry';
import { getTransactionFeedback } from '../src/lib/feedback/transaction-feedback';

describe('Service Availability System & Registry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('registers all 13 core services across airtime, data, electricity, tv, and water', () => {
    expect(MASTER_SERVICES.length).toBe(13);
    const serviceIds = MASTER_SERVICES.map(s => s.id);
    expect(serviceIds).toContain('safaricom-airtime');
    expect(serviceIds).toContain('airtel-airtime');
    expect(serviceIds).toContain('telkom-airtime');
    expect(serviceIds).toContain('faiba-airtime');
    expect(serviceIds).toContain('equitel-airtime');
    expect(serviceIds).toContain('faiba-data');
    expect(serviceIds).toContain('kplc-prepaid');
    expect(serviceIds).toContain('kplc-postpaid');
    expect(serviceIds).toContain('nairobi-water');
    expect(serviceIds).toContain('dstv');
    expect(serviceIds).toContain('gotv');
    expect(serviceIds).toContain('startimes');
    expect(serviceIds).toContain('zuku');
  });

  it('defaults active services including Faiba bundles to enabled without env override', () => {
    delete process.env.NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA;
    delete process.env.NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES;
    delete process.env.NEXT_PUBLIC_SERVICE_STATUS_SAFARICOM_AIRTIME;

    expect(getServiceStatus('safaricom-airtime')).toBe('enabled');
    expect(getServiceStatus('kplc-prepaid')).toBe('enabled');
    expect(getServiceStatus('nairobi-water')).toBe('enabled');
    expect(getServiceStatus('dstv')).toBe('enabled');
    expect(getServiceStatus('faiba-data')).toBe('enabled');
  });

  it('supports unified environment override for any service (enabled, coming_soon, hidden)', () => {
    process.env.NEXT_PUBLIC_SERVICE_STATUS_GOTV = 'coming_soon';
    process.env.NEXT_PUBLIC_SERVICE_STATUS_STARTIMES = 'hidden';
    process.env.NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA = 'enabled';

    expect(getServiceStatus('gotv')).toBe('coming_soon');
    expect(getServiceStatus('startimes')).toBe('hidden');
    expect(getServiceStatus('faiba-data')).toBe('enabled');
  });

  it('supports legacy Faiba bundles feature flag migration', () => {
    delete process.env.NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA;

    process.env.NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES = 'true';
    expect(getServiceStatus('faiba-data')).toBe('enabled');
    expect(isServiceEnabled('faiba-data')).toBe(true);

    process.env.NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES = 'false';
    expect(getServiceStatus('faiba-data')).toBe('coming_soon');
    expect(isServiceEnabled('faiba-data')).toBe(false);
  });

  it('excludes hidden services from getVisibleServices but retains coming_soon', () => {
    process.env.NEXT_PUBLIC_SERVICE_STATUS_ZUKU = 'hidden';
    process.env.NEXT_PUBLIC_SERVICE_STATUS_GOTV = 'coming_soon';

    const visible = getVisibleServices();
    const visibleIds = visible.map(s => s.id);

    expect(visibleIds).not.toContain('zuku');
    expect(visibleIds).toContain('gotv');
    const gotv = visible.find(s => s.id === 'gotv');
    expect(gotv?.status).toBe('coming_soon');
  });

  it('correctly organizes visible services into defined category groups', () => {
    delete process.env.NEXT_PUBLIC_SERVICE_STATUS_ZUKU;
    const groups = getGroupedServices();

    expect(groups.length).toBe(2);
    expect(groups[0].key).toBe('airtime_data');
    expect(groups[0].title).toBe('Airtime & Data Bundles');
    expect(groups[0].services.some(s => s.id === 'safaricom-airtime')).toBe(true);

    expect(groups[1].key).toBe('bill_payments');
    expect(groups[1].title).toBe('Utility & Entertainment Bills');
    expect(groups[1].services.some(s => s.id === 'kplc-prepaid')).toBe(true);
    expect(groups[1].services.some(s => s.id === 'nairobi-water')).toBe(true);
  });

  it('provides distinct top-level service categories for the hero launcher', () => {
    const categories = getServiceCategories();
    expect(categories.length).toBe(5);
    const catIds = categories.map(c => c.id);
    expect(catIds).toEqual(['airtime', 'data', 'electricity', 'tv', 'water']);
  });
});

describe('Customer-First Transaction Feedback Engine', () => {
  it('formats SUCCESS states with warm confirmation and delivery details', () => {
    const feedback = getTransactionFeedback({
      status: 'SUCCESS',
      order: {
        serviceName: 'KPLC Prepaid Electricity',
        destination: '14123456789',
        amount: 1000
      },
      reference: 'QSN-20260908-1001'
    });

    expect(feedback.category).toBe('SUCCESS');
    expect(feedback.severity).toBe('success');
    expect(feedback.headline).toBe('Payment & Vending Complete');
    expect(feedback.context).toContain('KPLC Prepaid Electricity');
    expect(feedback.context).toContain('14123456789');
    expect(feedback.isRefundPending).toBe(false);
    expect(feedback.showRetry).toBe(false);
  });

  it('formats REFUND_PENDING states with clear money safety reassurance and support reference', () => {
    const feedback = getTransactionFeedback({
      status: 'VENDING_FAILED_REFUND_PENDING',
      message: 'Kyanda Insufficient Funds',
      order: {
        serviceName: 'DStv Subscription',
        destination: '1029384756',
        amount: 1600
      },
      reference: 'QSN-20260908-1002'
    });

    expect(feedback.category).toBe('REFUND_PENDING');
    expect(feedback.severity).toBe('refund');
    expect(feedback.isRefundPending).toBe(true);
    expect(feedback.headline).toBe('Payment Received — Automatic Refund in Progress');
    // Must clearly state payment WAS received and money is being refunded
    expect(feedback.context).toContain('Payment of KES 1,600 was received');
    expect(feedback.context).toContain('could not be delivered');
    expect(feedback.nextStepGuidance).toContain('No action is needed on your end');
    expect(feedback.nextStepGuidance).toContain('your refund will be returned to your M-Pesa');
    expect(feedback.reference).toBe('QSN-20260908-1002');
    expect(feedback.showSupport).toBe(true);
  });

  it('formats INSUFFICIENT_FUNDS / SERVICE_UNAVAILABLE apologetically with no blame on customer', () => {
    const feedback = getTransactionFeedback({
      status: 'FAILED',
      message: 'Service temporarily unavailable. Provider float exhausted.',
      order: {
        serviceName: 'Faiba Airtime',
        destination: '0747123456',
        amount: 200
      },
      reference: 'QSN-20260908-1003'
    });

    expect(feedback.category).toBe('SERVICE_UNAVAILABLE');
    expect(feedback.severity).toBe('error');
    expect(feedback.headline).toBe('Service Temporarily Paused');
    expect(feedback.context).not.toMatch(/error details|exception|crash|dump/i);
    expect(feedback.nextStepGuidance).toContain('check back in a few minutes');
    expect(feedback.showRetry).toBe(true);
  });

  it('formats VALIDATION_ERROR with actionable correction advice for meter/phone/amount', () => {
    const feedbackMeter = getTransactionFeedback({
      status: 'FAILED',
      message: 'Invalid meter number. Must be 11 digits.',
      reference: 'QSN-20260908-1004'
    });

    expect(feedbackMeter.category).toBe('VALIDATION_ERROR');
    expect(feedbackMeter.headline).toBe('Please Double-Check Your Details');
    expect(feedbackMeter.nextStepGuidance).toContain('Review your account or phone number');
    expect(feedbackMeter.showRetry).toBe(true);
    expect(feedbackMeter.retryLabel).toBe('Edit & Try Again');

    const feedbackPhone = getTransactionFeedback({
      status: 'FAILED',
      message: 'Invalid phone prefix for telco Safaricom',
      reference: 'QSN-20260908-1005'
    });
    expect(feedbackPhone.context).toContain('phone number');
  });

  it('formats DUPLICATE_REQUEST reassuringly without causing alarm', () => {
    const feedback = getTransactionFeedback({
      status: 'FAILED',
      message: 'A similar transaction is already in progress. Please wait.',
      reference: 'QSN-20260908-1006'
    });

    expect(feedback.category).toBe('DUPLICATE_REQUEST');
    expect(feedback.severity).toBe('warning');
    expect(feedback.headline).toBe('Order Already in Motion');
    expect(feedback.context).toContain('already initiated moments ago');
    expect(feedback.nextStepGuidance).toContain('Please wait a minute before re-ordering');
  });

  it('formats PAYMENT_CANCELLED and TIMEOUT with clear next steps', () => {
    const feedbackCancelled = getTransactionFeedback({
      status: 'PAYMENT_FAILED',
      message: 'Request cancelled by user',
      reference: 'QSN-20260908-1007'
    });

    expect(feedbackCancelled.category).toBe('PAYMENT_CANCELLED');
    expect(feedbackCancelled.headline).toBe('M-Pesa Payment Not Completed');
    expect(feedbackCancelled.showRetry).toBe(true);

    const feedbackTimeout = getTransactionFeedback({
      status: 'TIMEOUT',
      message: 'Transaction timed out waiting for PIN entry',
      reference: 'QSN-20260908-1008'
    });

    expect(feedbackTimeout.category).toBe('TIMEOUT');
    expect(feedbackTimeout.headline).toBe('Verification Taking a Little Longer');
    expect(feedbackTimeout.nextStepGuidance).toContain('If your M-Pesa account was charged');
  });
});
