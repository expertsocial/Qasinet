import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateReceiptHtml,
  sendReceiptEmail,
  sendAdminRefundAlertEmail,
  formatTokenForDisplay,
} from '@/lib/services/email';
import * as emailClient from '@/lib/email/client';

describe('Receipt and Refund Notification Emails', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatTokenForDisplay', () => {
    it('formats a 20-digit token into 4-digit hyphenated blocks', () => {
      expect(formatTokenForDisplay('12345678901234567890')).toBe('1234 - 5678 - 9012 - 3456 - 7890');
    });

    it('returns non-20-digit strings as is', () => {
      expect(formatTokenForDisplay('12345')).toBe('12345');
    });
  });

  describe('generateReceiptHtml', () => {
    it('renders SUCCESS receipt with token callout and green accent', () => {
      const html = generateReceiptHtml({
        to: 'customer@example.com',
        reference: 'QSN-20260915-ABCD12',
        amount: 500,
        serviceName: 'Kenya Power Prepaid',
        destination: '14285714285',
        paymentReference: 'SJC1234567',
        token: '12345678901234567890',
        units: '24.5',
        status: 'SUCCESS',
      });

      expect(html).toContain('PAYMENT & VENDING CONFIRMED');
      expect(html).toContain('1234 - 5678 - 9012 - 3456 - 7890');
      expect(html).toContain('24.5 kWh');
      expect(html).toContain('QSN-20260915-ABCD12');
      expect(html).toContain('SJC1234567');
      expect(html).toContain('KES 500.00');
    });

    it('renders VENDING_FAILED_REFUND_PENDING with reassuring verified copy', () => {
      const html = generateReceiptHtml({
        to: 'customer@example.com',
        reference: 'QSN-20260915-REF001',
        amount: 1000,
        serviceName: 'KPLC Prepaid Tokens',
        destination: '14285714285',
        paymentReference: 'SJC9988776',
        status: 'VENDING_FAILED_REFUND_PENDING',
        failureReason: 'KPLC IT system downtime',
      });

      expect(html).toContain('REFUND UNDER REVIEW');
      expect(html).toContain('Payment Received — Refund Under Review');
      expect(html).toContain('utility could not be delivered by the provider at this time');
      expect(html).toContain('Our team has been notified and will process your refund');
      expect(html).toContain('support@qasinet.com');
      expect(html).toContain('QSN-20260915-REF001');
    });

    it('renders PAYMENT_FAILED receipt with clear notice', () => {
      const html = generateReceiptHtml({
        to: 'customer@example.com',
        reference: 'QSN-20260915-FAIL01',
        amount: 250,
        serviceName: 'Safaricom Airtime',
        destination: '0712345678',
        status: 'PAYMENT_FAILED',
      });

      expect(html).toContain('PAYMENT UNSUCCESSFUL');
      expect(html).toContain('We could not confirm payment');
      expect(html).toContain('Safaricom automatically reverses unfulfilled prompts');
    });
  });

  describe('sendReceiptEmail client dispatch', () => {
    it('calls shared sendEmail with correct subject for SUCCESS', async () => {
      const spy = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'msg_test_123',
      });

      const res = await sendReceiptEmail({
        to: 'test@example.com',
        reference: 'QSN-TEST-1',
        amount: 100,
        serviceName: 'Airtel Airtime',
        destination: '0733123456',
        status: 'SUCCESS',
      });

      expect(res.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].subject).toContain('Your QasiNet Order Receipt for Airtel Airtime');
      expect(spy.mock.calls[0][0].to).toBe('test@example.com');
    });

    it('calls shared sendEmail with refund subject for VENDING_FAILED_REFUND_PENDING', async () => {
      const spy = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'msg_test_refund',
      });

      const res = await sendReceiptEmail({
        to: 'customer@example.com',
        reference: 'QSN-TEST-REFUND',
        amount: 500,
        serviceName: 'KPLC Tokens',
        destination: '14285714285',
        status: 'VENDING_FAILED_REFUND_PENDING',
      });

      expect(res.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].subject).toContain('Refund Under Review');
    });
  });

  describe('sendAdminRefundAlertEmail', () => {
    it('dispatches high-priority alert to configured admin address with direct link', async () => {
      const spy = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'msg_admin_alert',
      });

      const res = await sendAdminRefundAlertEmail({
        reference: 'QSN-ALERT-001',
        amount: 1500,
        serviceName: 'Kenya Power Prepaid',
        destination: '14285714285',
        paymentReference: 'SJC5544332',
        failureReason: 'KPLC API timeout during vending',
      });

      expect(res.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      const callArg = spy.mock.calls[0][0];

      expect(callArg.to).toBe('qasinetltd@gmail.com');
      expect(callArg.subject).toContain('[ACTION REQUIRED] Refund Pending: KES 1,500');
      expect(callArg.html).toContain('QSN-ALERT-001');
      expect(callArg.html).toContain('SJC5544332');
      expect(callArg.html).toContain('KPLC API timeout during vending');
      expect(callArg.html).toContain('/admin/transactions?search=QSN-ALERT-001');
    });
  });
});
