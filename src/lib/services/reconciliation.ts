import { SupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from './orchestrator';
import { KyandaProvider } from '../providers/kyanda/provider';
import { MpesaDarajaProvider } from '../providers/mpesa/provider';
import { executeVendingForTransaction } from './vending';

export class ReconciliationService {
  private readonly mpesaProvider: MpesaDarajaProvider;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly orchestrator: TransactionOrchestrator,
    private readonly kyandaProvider: KyandaProvider,
    mpesaProvider?: MpesaDarajaProvider
  ) {
    this.mpesaProvider = mpesaProvider || new MpesaDarajaProvider();
  }

  public async reconcilePendingTransactions() {
    console.log('[Reconciliation] Starting run...');

    // 1. Immediately recover any VENDING_PENDING transactions missing a provider reference
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: missingRefTxs } = await this.supabase
      .from('transactions')
      .select('id, qsn_reference, status, created_at')
      .eq('status', 'VENDING_PENDING')
      .is('kyanda_reference', null)
      .lte('created_at', thirtySecsAgo)
      .limit(20);

    if (missingRefTxs && missingRefTxs.length > 0) {
      console.log(`[Reconciliation] Found ${missingRefTxs.length} VENDING_PENDING txs missing provider reference. Dispatching vending now...`);
      for (const mTx of missingRefTxs) {
        try {
          console.log(`[Reconciliation] Dispatching vending for TX ${mTx.id} (${mTx.qsn_reference})`);
          await executeVendingForTransaction(mTx.id, this.supabase);
        } catch (mErr: any) {
          console.error(`[Reconciliation] Failed to vend for TX ${mTx.id}:`, mErr?.message);
        }
      }
    }
    
    // 2. Find VENDING_PENDING transactions with kyanda_reference to poll
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: pendingTxs, error } = await this.supabase
      .from('transactions')
      .select('id, kyanda_reference, status, created_at, next_retry_at')
      .eq('status', 'VENDING_PENDING')
      .not('kyanda_reference', 'is', null)
      .lte('created_at', twoMinAgo)
      .limit(50); // Process in batches

    if (error) {
      console.error('[Reconciliation] Failed to fetch pending txs:', error);
    } else if (!pendingTxs || pendingTxs.length === 0) {
      console.log('[Reconciliation] No VENDING_PENDING transactions to reconcile.');
    } else {
      const now = new Date();

      for (const tx of pendingTxs) {
      // Respect exponential backoff schedule
      if (tx.next_retry_at && new Date(tx.next_retry_at) > now) {
        continue; 
      }

      console.log(`[Reconciliation] Checking transaction ${tx.id} (Kyanda Ref: ${tx.kyanda_reference})`);

      if (!tx.kyanda_reference) {
        continue;
      }

      try {
        const response = await this.kyandaProvider.checkTransactionStatus(tx.kyanda_reference);
        const { status: kyandaStatus, details } = response;
        const statusStr = kyandaStatus?.toLowerCase() || details?.Status?.toLowerCase() || '';

        let isFinal = false;
        let isSuccess = false;

        if (statusStr === 'success' || statusStr === '0000') {
          isFinal = true;
          isSuccess = true;
        } else if (statusStr === 'failed' || statusStr.includes('error')) {
          isFinal = true;
          isSuccess = false;
        }

        // Extract any tokens, units, receipts returned by checkTransactionStatus
        const rawRes = response as unknown as Record<string, unknown>;
        const rawDetails = details as unknown as Record<string, unknown>;
        const token = (rawRes?.Token || rawRes?.token || rawDetails?.Token || rawDetails?.token || rawDetails?.token_code) as string | undefined;
        const units = (rawRes?.Units || rawRes?.units || rawDetails?.Units || rawDetails?.units) as string | number | undefined;
        const receipt = (rawRes?.Receipt || rawRes?.receipt || rawDetails?.Receipt || rawDetails?.receipt) as string | undefined;

        const metadata: Record<string, unknown> = {};
        if (token) metadata.token = String(token);
        if (units) metadata.units = String(units);
        if (receipt) metadata.receipt = String(receipt);
        if (details) metadata.providerDetails = details;

        if (isFinal) {
          console.log(`[Reconciliation] Transaction ${tx.id} is final: success=${isSuccess}`);
          if (isSuccess) {
            await this.orchestrator.finalizeTransaction(
              tx.id, 
              true, 
              undefined, 
              tx.kyanda_reference,
              Object.keys(metadata).length > 0 ? metadata : undefined
            );
          } else {
            // Customer paid, but vending definitively failed: transition to VENDING_FAILED_REFUND_PENDING
            await this.orchestrator.finalizeTransaction(
              tx.id, 
              false, 
              `Reconciled as ${kyandaStatus || 'Failed'}`, 
              tx.kyanda_reference,
              Object.keys(metadata).length > 0 ? metadata : undefined,
              'VENDING_FAILED_REFUND_PENDING'
            );
          }
        } else {
          // Still pending. Schedule next retry with exponential backoff.
          const ageMs = Date.now() - new Date(tx.created_at).getTime();
          let backoffMs = ageMs; 
          
          if (backoffMs < 5 * 60 * 1000) backoffMs = 5 * 60 * 1000; // Min 5 min backoff
          if (backoffMs > 24 * 60 * 60 * 1000) backoffMs = 24 * 60 * 60 * 1000; // Max 24hr

          // But if it's older than 48 hours, give up and transition to refund pending.
          if (ageMs > 48 * 60 * 60 * 1000) {
            console.warn(`[Reconciliation] Transaction ${tx.id} exceeded 48h timeout.`);
            await this.orchestrator.markVendingFailedRefundPending(
              tx.id, 
              'Reconciliation Timeout (48h)',
              tx.kyanda_reference,
              Object.keys(metadata).length > 0 ? metadata : undefined
            );
            continue;
          }

          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
          
          await this.supabase
            .from('transactions')
            .update({ next_retry_at: nextRetryAt })
            .eq('id', tx.id);
            
          console.log(`[Reconciliation] Transaction ${tx.id} still pending. Scheduled retry at ${nextRetryAt}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Reconciliation] Error checking Kyanda status for ${tx.id}:`, errorMsg);
        // We do not fail the transaction immediately on a network/API error from Kyanda.
        // We will retry next time.
      }
    }
  }

    // Also reconcile stale PAYMENT_PENDING transactions
    await this.reconcileStalePaymentPendingTransactions();

    console.log('[Reconciliation] Run complete.');
  }

  /**
   * Reconciles transactions stuck in PAYMENT_PENDING for 90+ seconds by querying Daraja STK status.
   * If payment succeeded, transitions to PAYMENT_CONFIRMED.
   * If cancelled, timed out, or failed, transitions cleanly to PAYMENT_FAILED with exact reason.
   */
  public async reconcileStalePaymentPendingTransactions() {
    console.log('[Reconciliation] Checking stale PAYMENT_PENDING transactions...');
    const ninetySecsAgo = new Date(Date.now() - 90 * 1000).toISOString();

    const { data: pendingTxs, error } = await this.supabase
      .from('transactions')
      .select('id, qsn_reference, payment_reference, status, created_at')
      .eq('status', 'PAYMENT_PENDING')
      .lte('created_at', ninetySecsAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !pendingTxs) {
      console.error('[Reconciliation] Failed to fetch stale PAYMENT_PENDING txs:', error);
      return;
    }

    if (pendingTxs.length === 0) {
      console.log('[Reconciliation] No stale PAYMENT_PENDING transactions found.');
      return;
    }

    console.log(`[Reconciliation] Found ${pendingTxs.length} stale PAYMENT_PENDING transaction(s) to reconcile.`);

    for (const tx of pendingTxs) {
      try {
        const ageMs = Date.now() - new Date(tx.created_at).getTime();

        if (!tx.payment_reference) {
          // If older than 3 minutes without a payment reference (STK dispatch never completed)
          if (ageMs > 3 * 60 * 1000) {
            console.warn(`[Reconciliation] TX ${tx.id} (${tx.qsn_reference}) has no payment_reference after 3m. Marking PAYMENT_FAILED.`);
            await this.orchestrator.updatePaymentState(
              tx.id,
              'PAYMENT_FAILED',
              undefined,
              'M-Pesa STK prompt was not dispatched or failed'
            );
          }
          continue;
        }

        // Fast-path: If transaction is older than 15 minutes, Safaricom STK prompt is definitively
        // dead (USSD lifetime is <= 120s). Do not query Daraja for stale transactions from hours/days ago,
        // as Daraja query will hang or reject purged CheckoutRequestIDs.
        if (ageMs > 15 * 60 * 1000) {
          console.log(`[Reconciliation] TX ${tx.id} (${tx.qsn_reference}) is older than 15m. Marking PAYMENT_FAILED directly.`);
          await this.orchestrator.updatePaymentState(
            tx.id,
            'PAYMENT_FAILED',
            undefined,
            'M-Pesa payment prompt expired (15m timeout)'
          );
          continue;
        }

        try {
          console.log(`[Reconciliation] Querying Daraja for TX ${tx.id} (${tx.qsn_reference}, CheckoutRequestID: ${tx.payment_reference})`);
          const queryRes = await this.mpesaProvider.querySTKStatus(tx.payment_reference);

          if (queryRes.ResultCode === '0') {
            console.log(`[Reconciliation] Payment confirmed on Daraja for TX ${tx.id}. Immediately executing vending.`);
            await executeVendingForTransaction(tx.id, this.supabase);
          } else {
            // ResultCode != 0 (e.g. 1032 user cancelled, 1037 timeout, 1 insufficient balance, 4999 duplicated session)
            const reason = queryRes.ResultDesc || 'M-Pesa payment prompt expired or declined';
            console.log(`[Reconciliation] Daraja STK status for TX ${tx.id}: ResultCode ${queryRes.ResultCode} (${reason}). Marking PAYMENT_FAILED.`);
            await this.orchestrator.updatePaymentState(
              tx.id,
              'PAYMENT_FAILED',
              undefined,
              reason
            );
          }
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          console.warn(`[Reconciliation] Daraja query error for TX ${tx.id}:`, errorMsg);

          // If older than 5 minutes, force-resolve as PAYMENT_FAILED so customer is never stuck indefinitely
          if (ageMs > 5 * 60 * 1000) {
            console.warn(`[Reconciliation] TX ${tx.id} (${tx.qsn_reference}) in PAYMENT_PENDING exceeded 5m cutoff. Marking PAYMENT_FAILED.`);
            await this.orchestrator.updatePaymentState(
              tx.id,
              'PAYMENT_FAILED',
              undefined,
              'M-Pesa payment prompt expired (5m timeout)'
            );
          }
        }
      } catch (txErr: any) {
        console.error(`[Reconciliation] Failed to reconcile TX ${tx.id}:`, txErr?.message || txErr);
      }
    }
  }
}
