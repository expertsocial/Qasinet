import { Resend, type CreateEmailOptions, type CreateEmailRequestOptions } from 'resend';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  attempts?: number;
}

/**
 * Masks an email address for safe audit logging without leaking customer PII.
 * Example: qasinetltd@gmail.com -> q***d@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function maskRecipients(recipients: string | string[]): string {
  if (Array.isArray(recipients)) {
    return recipients.map(maskEmail).join(', ');
  }
  return maskEmail(recipients);
}

/**
 * Retrieves the Resend API credentials from environment variables or Supabase system_settings.
 */
export async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  let apiKey = process.env.RESEND_API_KEY || '';
  let fromEmail = process.env.RESEND_FROM_EMAIL || 'QasiNet <onboarding@resend.dev>';

  if (!apiKey || apiKey.startsWith('re_your_')) {
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
      // Ignore database lookup errors for credentials
    }
  }

  return { apiKey, fromEmail };
}

/**
 * Shared Resend Email Client
 * Wraps Resend SDK with AbortController timeout, exponential backoff retries,
 * masked audit logging, and guaranteed non-blocking graceful degradation.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { apiKey, fromEmail: defaultFrom } = await getResendCredentials();
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const maskedTo = maskRecipients(options.to);
  const from = options.from || defaultFrom;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = options.maxRetries ?? 2; // Up to 3 total attempts (0, 1, 2)

  // Validate recipient list
  if (!toList.length || toList.some(e => !e || !e.includes('@'))) {
    console.warn(`[Resend Client] Invalid recipient specified: ${maskedTo}`);
    return { success: false, error: 'Invalid recipient email address' };
  }

  // If no valid API key is present, log and gracefully mock
  if (!apiKey || apiKey.startsWith('re_your_')) {
    console.warn(`[Resend Client Mock] RESEND_API_KEY is not configured. Simulating email dispatch to: ${maskedTo}`);
    console.log(`[Resend Client Mock] Subject: "${options.subject}"`);
    return { success: true, id: `mock_email_${Date.now()}`, attempts: 1 };
  }

  const resend = new Resend(apiKey);
  let lastError: { message?: string; name?: string } | Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      console.log(`[Resend Client] Dispatching email to ${maskedTo} (Subject: "${options.subject}", Attempt ${attempt + 1}/${maxRetries + 1})`);

      // Construct Resend email payload satisfying CreateEmailOptions union
      const payload: CreateEmailOptions = options.html
        ? {
            from,
            to: toList,
            subject: options.subject,
            replyTo: options.replyTo,
            tags: options.tags,
            html: options.html,
            text: options.text,
          }
        : {
            from,
            to: toList,
            subject: options.subject,
            replyTo: options.replyTo,
            tags: options.tags,
            text: options.text || '',
          };

      // Race Resend SDK call against AbortController signal
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const err = new Error('Request timed out');
          err.name = 'AbortError';
          reject(err);
        });
      });

      const sendPromise = resend.emails.send(payload, {
        signal: controller.signal,
      } as CreateEmailRequestOptions);

      const { data, error } = await Promise.race([sendPromise, timeoutPromise]);

      clearTimeout(timeoutId);

      if (error) {
        lastError = error;
        console.warn(`[Resend Client Warning] Resend API error on attempt ${attempt + 1} for ${maskedTo}: ${error.message} (${error.name || 'API_ERROR'})`);

        // If it's a domain/sandbox restriction (e.g. 403 sending to unverified domain), retrying won't help
        const isClientForbidden = error.message?.includes('testing emails to your own email address') || error.message?.includes('verify a domain');
        if (isClientForbidden) {
          console.warn(`[Resend Client Notice] Sandbox restriction encountered for ${maskedTo}. Will not retry.`);
          return { success: false, error: error.message, attempts: attempt + 1 };
        }

        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 1500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return { success: false, error: error.message, attempts: attempt + 1 };
      }

      console.log(`[Resend Client Success] Email successfully sent to ${maskedTo} (ID: ${data?.id})`);
      return { success: true, id: data?.id, attempts: attempt + 1 };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorObj = (err instanceof Error ? err : new Error(String(err))) as Error & { code?: string };
      lastError = errorObj;

      const isAbort = errorObj.name === 'AbortError' || controller.signal.aborted;
      const isNetwork =
        isAbort ||
        errorObj.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        errorObj.message?.includes('fetch failed') ||
        errorObj.message?.includes('timeout') ||
        errorObj.message?.includes('getaddrinfo');

      if (isNetwork && attempt < maxRetries) {
        const delay = (attempt + 1) * 1500;
        console.warn(
          `[Resend Client] Network/timeout error sending to ${maskedTo} (attempt ${attempt + 1}/${maxRetries + 1}): ${errorObj.message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error(`[Resend Client Error] Exception sending email to ${maskedTo}: ${errorObj.message}`);
      return { success: false, error: errorObj.message || 'Unknown network error', attempts: attempt + 1 };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Email dispatch failed after maximum retry attempts',
    attempts: maxRetries + 1,
  };
}
