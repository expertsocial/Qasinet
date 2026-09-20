import { sendEmail, SendEmailResult } from '@/lib/email/client';

export interface ReceiptEmailParams {
  to: string;
  customerName?: string;
  reference: string;
  amount: number;
  serviceName: string;
  serviceType?: string;
  destination: string;
  paymentReference?: string;
  providerReference?: string;
  date?: string;
  token?: string;
  units?: string | number;
  accountName?: string;
  status?: 'SUCCESS' | 'VENDING_FAILED_REFUND_PENDING' | 'PAYMENT_FAILED' | string;
  failureReason?: string;
}

export interface AdminRefundAlertParams {
  reference: string;
  amount: number;
  serviceName: string;
  serviceType?: string;
  destination: string;
  paymentReference?: string;
  providerReference?: string;
  failureReason?: string;
  date?: string;
  customerName?: string;
  customerEmail?: string;
}

export function formatTokenForDisplay(rawToken: string): string {
  // Cleans and groups 20-digit tokens into 4-digit blocks: XXXX - XXXX - XXXX - XXXX - XXXX
  const cleaned = rawToken.replace(/[^0-9]/g, '');
  if (cleaned.length === 20) {
    return cleaned.match(/.{1,4}/g)?.join(' - ') || rawToken;
  }
  return rawToken;
}

export function generateReceiptHtml(params: ReceiptEmailParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';
  const receiptUrl = `${baseUrl}/receipt/${encodeURIComponent(params.reference)}`;
  const formattedDate = params.date
    ? new Date(params.date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    : new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const displayToken = params.token ? formatTokenForDisplay(params.token) : null;
  const status = params.status || (params.token ? 'SUCCESS' : 'SUCCESS');

  // Colors & badges based on transaction status
  let accentGradient = 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)';
  let badgeStyle = 'background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399;';
  let badgeLabel = '✓ PAYMENT & VENDING CONFIRMED';
  let subheaderText = 'Official Digital Transaction Receipt';

  if (status === 'VENDING_FAILED_REFUND_PENDING') {
    accentGradient = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    badgeStyle = 'background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24;';
    badgeLabel = '⚠️ REFUND UNDER REVIEW';
    subheaderText = 'Order Status & Support Notice';
  } else if (status === 'PAYMENT_FAILED') {
    accentGradient = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    badgeStyle = 'background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171;';
    badgeLabel = '✕ PAYMENT UNSUCCESSFUL';
    subheaderText = 'Transaction Notice';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your QasiNet Order [${params.reference}]</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <!-- Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f293d; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 6px; background: ${accentGradient};"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 24px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">
                      QASI<span style="color: #10b981;">NET</span>
                    </div>
                    <div style="display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; ${badgeStyle}">
                      ${badgeLabel}
                    </div>
                    <p style="margin: 12px 0 0; font-size: 14px; color: #94a3b8;">${subheaderText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Refund Pending Notice (KPLC / Incident Verified Tone) -->
          ${status === 'VENDING_FAILED_REFUND_PENDING' ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px;">
                <tr>
                  <td style="padding: 20px 20px; text-align: left;">
                    <div style="font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">
                      Payment Received — Refund Under Review
                    </div>
                    <p style="margin: 0 0 10px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                      Payment of <strong>KES ${Number(params.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong> for ${params.serviceName} was received, but the utility could not be delivered by the provider at this time.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                      Our team has been notified and will process your refund. Please contact support with reference <strong>${params.reference}</strong> so we can assist you right away.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Payment Failed Notice -->
          ${status === 'PAYMENT_FAILED' ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px;">
                <tr>
                  <td style="padding: 20px 20px; text-align: left;">
                    <div style="font-size: 14px; font-weight: 700; color: #f87171; margin-bottom: 6px;">
                      Payment Unsuccessful
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                      We could not confirm payment for ${params.serviceName}. If funds were deducted, Safaricom automatically reverses unfulfilled prompts. You can safely try your order again.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- KPLC Token Callout (If Electricity Token exists) -->
          ${displayToken ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%); border: 2px solid rgba(245, 158, 11, 0.35); border-radius: 16px; text-align: center;">
                <tr>
                  <td style="padding: 20px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">
                      ⚡ KPLC Prepaid Electricity Token
                    </div>
                    <div style="margin: 14px 0 8px; font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">
                      ${displayToken}
                    </div>
                    ${params.units ? `
                    <div style="font-size: 14px; color: #cbd5e1; margin-top: 4px;">
                      Units Generated: <strong style="color: #38bdf8;">${params.units} kWh</strong>
                    </div>` : ''}
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 10px; font-style: italic;">
                      Key in this 20-digit token into your meter CIU keypad and press Enter / Blue button.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Amount Summary -->
          <tr>
            <td style="padding: 0 36px 20px; text-align: center;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">Total Amount</div>
              <div style="font-size: 34px; font-weight: 800; color: #ffffff; margin-top: 4px;">
                KES ${Number(params.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </div>
            </td>
          </tr>

          <!-- Details Table -->
          <tr>
            <td style="padding: 0 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a2234; border-radius: 12px; border: 1px solid #28334b;">
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">Service</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #ffffff; text-align: right; border-bottom: 1px solid #28334b;">${params.serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">Recipient / Destination</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #ffffff; text-align: right; font-family: monospace; border-bottom: 1px solid #28334b;">${params.destination}</td>
                </tr>
                ${params.accountName ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">Account Name</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #ffffff; text-align: right; border-bottom: 1px solid #28334b;">${params.accountName}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">QasiNet Reference</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #ffffff; text-align: right; font-family: monospace; border-bottom: 1px solid #28334b;">${params.reference}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">M-Pesa Receipt</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #34d399; text-align: right; font-family: monospace; border-bottom: 1px solid #28334b;">${params.paymentReference || (status === 'PAYMENT_FAILED' ? 'N/A' : 'CONFIRMED')}</td>
                </tr>
                ${params.providerReference ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #28334b;">Provider Ref</td>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #94a3b8; text-align: right; font-family: monospace; border-bottom: 1px solid #28334b;">${params.providerReference}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8;">Timestamp (EAT)</td>
                  <td style="padding: 12px 18px; font-size: 13px; color: #cbd5e1; text-align: right;">${formattedDate}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- View Online Button -->
          <tr>
            <td align="center" style="padding: 0 36px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 12px; background: ${accentGradient};">
                    <a href="${receiptUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">
                      View Live Order & Print Receipt →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0c111d; padding: 24px 36px; text-align: center; border-top: 1px solid #1f293d;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Thank you for using QasiNet! For support or inquiries, contact <a href="mailto:support@qasinet.com" style="color: #38bdf8; text-decoration: none;">support@qasinet.com</a> with reference <strong>${params.reference}</strong>.
              </p>
              <p style="margin: 10px 0 0; font-size: 11px; color: #475569;">
                QasiNet Instant Digital Utilities • Nairobi, Kenya
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends a customer transaction receipt or order confirmation email.
 * Non-blocking: failures are logged and returned gracefully without throwing.
 */
export async function sendReceiptEmail(params: ReceiptEmailParams): Promise<SendEmailResult> {
  const status = params.status || 'SUCCESS';
  let subject = `✓ Your QasiNet Order Receipt for ${params.serviceName} [${params.reference}]`;

  if (params.token) {
    subject = `⚡ Your KPLC Token & QasiNet Receipt [${params.reference}]`;
  } else if (status === 'VENDING_FAILED_REFUND_PENDING') {
    subject = `⚠️ Payment Received — Refund Under Review [${params.reference}]`;
  } else if (status === 'PAYMENT_FAILED') {
    subject = `QasiNet Payment Notice [${params.reference}]`;
  }

  const html = generateReceiptHtml(params);

  return await sendEmail({
    to: params.to,
    subject,
    html,
  });
}

/**
 * Sends an internal admin alert email whenever a transaction enters VENDING_FAILED_REFUND_PENDING.
 * Prioritized notification to ensure refunds are never delayed or left unaddressed.
 */
export async function sendAdminRefundAlertEmail(params: AdminRefundAlertParams): Promise<SendEmailResult> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'qasinetltd@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';
  const adminTxUrl = `${baseUrl}/admin/transactions?search=${encodeURIComponent(params.reference)}`;
  const formattedDate = params.date
    ? new Date(params.date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    : new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

  const subject = `🚨 [ACTION REQUIRED] Refund Pending: KES ${Number(params.amount).toLocaleString()} for ${params.serviceName} (${params.reference})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Refund Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #111827; border: 2px solid #ef4444; border-radius: 16px; overflow: hidden;">
    <div style="background-color: #dc2626; color: #ffffff; padding: 14px 24px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
      🚨 High-Priority Refund Alert — QasiNet Admin
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #fca5a5; margin: 0 0 16px; line-height: 1.5;">
        A customer transaction has entered <strong>VENDING_FAILED_REFUND_PENDING</strong>. M-Pesa payment was confirmed, but utility vending failed.
      </p>

      <table style="width: 100%; border-collapse: collapse; background-color: #1e293b; border-radius: 8px; overflow: hidden; font-size: 13px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid #334155;">Transaction Ref:</td>
          <td style="padding: 10px 14px; color: #ffffff; font-family: monospace; font-weight: 700; border-bottom: 1px solid #334155;">${params.reference}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid #334155;">Amount Paid:</td>
          <td style="padding: 10px 14px; color: #34d399; font-weight: 700; border-bottom: 1px solid #334155;">KES ${Number(params.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid #334155;">M-Pesa Receipt:</td>
          <td style="padding: 10px 14px; color: #ffffff; font-family: monospace; border-bottom: 1px solid #334155;">${params.paymentReference || 'CONFIRMED'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid #334155;">Service:</td>
          <td style="padding: 10px 14px; color: #ffffff; border-bottom: 1px solid #334155;">${params.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; border-bottom: 1px solid #334155;">Customer Destination:</td>
          <td style="padding: 10px 14px; color: #ffffff; font-family: monospace; border-bottom: 1px solid #334155;">${params.destination}</td>
        </tr>
        ${params.failureReason ? `
        <tr>
          <td style="padding: 10px 14px; color: #f87171; border-bottom: 1px solid #334155;">Failure Cause:</td>
          <td style="padding: 10px 14px; color: #fca5a5; border-bottom: 1px solid #334155;">${params.failureReason}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8;">Incident Timestamp:</td>
          <td style="padding: 10px 14px; color: #cbd5e1;">${formattedDate}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 24px 0 12px;">
        <a href="${adminTxUrl}" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
          Review Transaction & Initiate Refund →
        </a>
      </div>

      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 16px;">
        Alert triggered automatically by QasiNet Orchestrator to prevent unresolved refund backlogs.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return await sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}
