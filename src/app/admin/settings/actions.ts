'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';

export async function saveSettingsAction(key: string, value: any, description: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key,
      value,
      description,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: 'UPDATE_SETTINGS',
    targetTable: 'system_settings',
    targetId: key,
    details: { key, updated_by: user.id }
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function testKyandaConnectionAction(apiUrl: string, merchantId: string, apiKey: string) {
  try {
    // Generate signature for balance endpoint
    // We need to implement the standard Kyanda signature here for testing
    // To avoid importing node crypto in Edge, we can do a simple GET or mock check if URL is reachable
    
    // Actually, let's just make a simple check if the URL is valid by requesting the base URL
    // A true test would invoke /billing/v1/balance but that requires full signature generation
    // For now we will try a basic fetch to the API URL and check if it's reachable

    // We'll require crypto for the HMAC
    const crypto = require('crypto');
    const signatureString = `${merchantId}`;
    const signature = crypto.createHmac('sha256', apiKey).update(signatureString).digest('hex');

    const res = await fetch(`${apiUrl}/billing/v1/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': apiKey
      },
      body: JSON.stringify({
        MerchantID: merchantId,
        signature: signature
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    // Kyanda usually returns status code '0000' for success
    if (data.status === '0000' || data.status === '0001' || data.status_code === '0000') {
        return { success: true, message: 'Connection successful' };
    } else {
        return { success: false, message: data.details || 'Connection failed but reached API' };
    }

  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function testResendConnectionAction(apiKey: string, fromEmail: string, toEmail: string) {
  try {
    const key = apiKey.trim() || process.env.RESEND_API_KEY;
    if (!key) {
      return { success: false, message: 'No Resend API key provided. Please enter a valid key.' };
    }
    const from = fromEmail.trim() || process.env.RESEND_FROM_EMAIL || 'QasiNet <onboarding@resend.dev>';
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: [toEmail],
      subject: '✓ QasiNet Resend Integration Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #111827; color: #f9fafb; border-radius: 12px;">
          <h2 style="color: #10b981; margin-top: 0;">Resend API Verified!</h2>
          <p>Your Resend API key has been successfully configured and tested for QasiNet digital services.</p>
          <p style="font-size: 12px; color: #9ca3af;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `Test email sent successfully (ID: ${data?.id})` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Unknown error' };
  }
}

