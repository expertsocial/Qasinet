import { Resend } from 'resend';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.vercel.app';
  const receiptUrl = `${baseUrl}/receipt/${encodeURIComponent(params.reference)}`;
  const formattedDate = params.date 
    ? new Date(params.date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    : new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const displayToken = params.token ? formatTokenForDisplay(params.token) : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your QasiNet Receipt</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <!-- Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f293d; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);"></td>
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
                    <div style="display: inline-block; margin-top: 10px; padding: 4px 14px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; font-size: 12px; font-weight: 600; color: #34d399;">
                      ✓ PAYMENT & VENDING CONFIRMED
                    </div>
                    <p style="margin: 12px 0 0; font-size: 14px; color: #94a3b8;">Official Digital Transaction Receipt</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">Total Amount Paid</div>
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
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #34d399; text-align: right; font-family: monospace; border-bottom: 1px solid #28334b;">${params.paymentReference || 'CONFIRMED'}</td>
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
                  <td align="center" style="border-radius: 12px; background: linear-gradient(90deg, #10b981 0%, #059669 100%);">
                    <a href="${receiptUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">
                      View Live Receipt & Print PDF →
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
                Thank you for using QasiNet! For support or inquiries, email <a href="mailto:support@qasinet.com" style="color: #38bdf8; text-decoration: none;">support@qasinet.com</a> with reference <strong>${params.reference}</strong>.
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

async function getResendCredentials(): Promise<{ apiKey?: string; fromEmail: string }> {
  let apiKey = process.env.RESEND_API_KEY;
  let fromEmail = process.env.RESEND_FROM_EMAIL || 'QasiNet <onboarding@resend.dev>';

  // If apiKey is missing or placeholder in env, check system_settings
  if (!apiKey || apiKey === 're_your_resend_api_key_here') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (supabaseUrl && supabaseKey) {
        const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'resend_config')
          .maybeSingle();

        if (data?.value?.api_key) {
          apiKey = data.value.api_key;
        }
        if (data?.value?.from_email) {
          fromEmail = data.value.from_email;
        }
      }
    } catch {
      // ignore
    }
  }

  return { apiKey, fromEmail };
}

export async function sendReceiptEmail(params: ReceiptEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const { apiKey, fromEmail } = await getResendCredentials();

  if (!apiKey || apiKey === 're_your_resend_api_key_here') {
    console.warn(`[Resend Email] RESEND_API_KEY is not configured. Simulating email dispatch to: ${params.to}`);
    console.log(`[Resend Email Mock] Reference: ${params.reference}, Subject: QasiNet Receipt for ${params.serviceName}`);
    return { success: true, id: `mock_email_${Date.now()}` };
  }

  try {
    const resend = new Resend(apiKey);
    const subject = params.token
      ? `⚡ Your KPLC Token & QasiNet Receipt [${params.reference}]`
      : `✓ Your QasiNet Receipt for ${params.serviceName} [${params.reference}]`;

    const htmlContent = generateReceiptHtml(params);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('[Resend Email Error]:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Email Sent] Successfully sent receipt for ${params.reference} to ${params.to} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[Resend Email Exception]:', err.message || err);
    return { success: false, error: err.message || 'Unknown email dispatch error' };
  }
}
