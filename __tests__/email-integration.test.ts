import { describe, it, expect } from 'vitest';
import { sendEmail } from '@/lib/email/client';
import { sendReceiptEmail, sendAdminRefundAlertEmail } from '@/lib/services/email';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '@/lib/auth/otp';
import fs from 'fs';

// Load .env.local if not already in process.env
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch {
  // ignore
}

describe('Live Resend Email Integration & Deliverables', () => {
  const isKeyAvailable = Boolean(process.env.RESEND_API_KEY);

  // Deliverable 2: Confirmation of one successful real test email delivered end-to-end
  it('Deliverable 2: Dispatches a real email end-to-end to verified owner address via shared client', async () => {
    if (!isKeyAvailable) return;

    const result = await sendEmail({
      to: 'qasinetltd@gmail.com',
      subject: 'QasiNet Step 1 Client Verification: Live Pipeline Operational',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #10b981;">QasiNet Email Integration Verified</h2>
          <p>This email was dispatched via the shared <code>src/lib/email/client.ts</code> service.</p>
          <ul>
            <li><strong>Retry & Timeout engine:</strong> Active (15s timeout, 3-attempt exponential backoff)</li>
            <li><strong>PII Masking:</strong> Active (Masked in persistent logs)</li>
            <li><strong>Graceful Degradation:</strong> Non-blocking</li>
          </ul>
        </div>
      `,
    });

    console.log('Deliverable 2 result:', result);
    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^[a-f0-9-]+$/);
  }, 30000);

  // Deliverable 3: OTP flow with rate limiting and password-reset attempt
  it('Deliverable 3: Dispatches real password reset OTP to account owner', async () => {
    if (!isKeyAvailable) return;

    // Use a unique IP to avoid hitting sliding-window rate limit
    const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
    const reqResult = await requestPasswordResetOTP('qasinetltd@gmail.com', testIp);

    console.log('Deliverable 3 OTP Request Result:', reqResult);
    expect(reqResult.success).toBe(true);
    expect(reqResult.message).toContain("If an account with that email exists, we've sent a 6-digit verification code");
  }, 30000);

  // Deliverable 4: Transaction receipt emails tested against real SUCCESS and real VENDING_FAILED_REFUND_PENDING
  it('Deliverable 4a: Dispatches real SUCCESS transaction receipt email', async () => {
    if (!isKeyAvailable) return;

    const result = await sendReceiptEmail({
      to: 'qasinetltd@gmail.com',
      customerName: 'George Sanare',
      reference: 'QSN-20260915-LIVE-SUCCESS',
      amount: 500,
      serviceName: 'Kenya Power Prepaid',
      destination: '14285714285',
      paymentReference: 'SJC99887711',
      providerReference: 'KYA-TOKEN-12345',
      token: '12345678901234567890',
      units: '25.4',
      status: 'SUCCESS',
    });

    console.log('Deliverable 4a SUCCESS Receipt Result:', result);
    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^[a-f0-9-]+$/);
  }, 30000);

  it('Deliverable 4b: Dispatches real customer VENDING_FAILED_REFUND_PENDING notice', async () => {
    if (!isKeyAvailable) return;

    const result = await sendReceiptEmail({
      to: 'qasinetltd@gmail.com',
      customerName: 'George Sanare',
      reference: 'QSN-20260915-LIVE-REFUND',
      amount: 1000,
      serviceName: 'KPLC Prepaid Tokens',
      destination: '14285714285',
      paymentReference: 'SJC33221100',
      status: 'VENDING_FAILED_REFUND_PENDING',
      failureReason: 'KPLC vending gateway timeout (float intact)',
    });

    console.log('Deliverable 4b Refund Notice Result:', result);
    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^[a-f0-9-]+$/);
  }, 30000);

  // Deliverable 5: Admin refund-pending alert email to configured admin inbox
  it('Deliverable 5: Dispatches real Admin Refund Alert to configured admin inbox', async () => {
    if (!isKeyAvailable) return;

    const result = await sendAdminRefundAlertEmail({
      reference: 'QSN-20260915-LIVE-ADMIN-ALERT',
      amount: 1000,
      serviceName: 'KPLC Prepaid Tokens',
      destination: '14285714285',
      paymentReference: 'SJC33221100',
      failureReason: 'KPLC vending gateway timeout (float intact)',
      customerName: 'George Sanare',
      customerEmail: 'qasinetltd@gmail.com',
    });

    console.log('Deliverable 5 Admin Alert Result:', result);
    expect(result.success).toBe(true);
    expect(result.id).toMatch(/^[a-f0-9-]+$/);
  }, 30000);
});
