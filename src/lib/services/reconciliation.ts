import { SupabaseClient } from '@supabase/supabase-js';
import { TransactionOrchestrator } from './orchestrator';
import { KyandaProvider } from '../providers/kyanda/provider';

export class ReconciliationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly orchestrator: TransactionOrchestrator,
    private readonly kyandaProvider: KyandaProvider
  ) {}

  public async reconcilePendingTransactions() {
    console.log('[Reconciliation] Starting run...');
    
    // Find VENDING_PENDING transactions where next_retry_at is due (or NULL meaning we should retry now if old enough)
    // We only poll transactions that have been pending for at least 1 minute, to give IPN a chance first.
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    const { data: pendingTxs, error } = await this.supabase
      .from('transactions')
      .select('id, kyanda_reference, status, created_at, next_retry_at')
      .eq('status', 'VENDING_PENDING')
      .lte('created_at', oneMinAgo)
      .limit(50); // Process in batches

    if (error || !pendingTxs) {
      console.error('[Reconciliation] Failed to fetch pending txs:', error);
      return;
    }

    if (pendingTxs.length === 0) {
      console.log('[Reconciliation] No pending transactions to reconcile.');
      return;
    }

    const now = new Date();

    for (const tx of pendingTxs) {
      // Respect exponential backoff schedule
      if (tx.next_retry_at && new Date(tx.next_retry_at) > now) {
        continue; 
      }

      console.log(`[Reconciliation] Checking transaction ${tx.id} (Kyanda Ref: ${tx.kyanda_reference})`);

      if (!tx.kyanda_reference) {
        // If we failed to even get a Kyanda reference, we must mark it failed or investigate manually.
        // For now, we'll mark it as VENDING_FAILED if it's over 1 hour old.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(tx.created_at) < oneHourAgo) {
          await this.orchestrator.finalizeTransaction(tx.id, false, 'No Kyanda reference obtained after 1 hour');
        }
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

        if (isFinal) {
          console.log(`[Reconciliation] Transaction ${tx.id} is final: ${isSuccess}`);
          await this.orchestrator.finalizeTransaction(tx.id, isSuccess, isSuccess ? undefined : `Reconciled as ${kyandaStatus}`);
        } else {
          // Still pending. Schedule next retry with exponential backoff.
          // Formula: Next retry in (current age * 2), capped at 24 hours.
          const ageMs = Date.now() - new Date(tx.created_at).getTime();
          let backoffMs = ageMs; 
          
          if (backoffMs < 5 * 60 * 1000) backoffMs = 5 * 60 * 1000; // Min 5 min backoff
          if (backoffMs > 24 * 60 * 60 * 1000) backoffMs = 24 * 60 * 60 * 1000; // Max 24hr

          // But if it's older than 48 hours, give up and mark as UNKNOWN/FAILED.
          if (ageMs > 48 * 60 * 60 * 1000) {
            console.warn(`[Reconciliation] Transaction ${tx.id} exceeded 48h timeout.`);
            await this.orchestrator.finalizeTransaction(tx.id, false, 'Reconciliation Timeout (48h)');
            continue;
          }

          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
          
          await this.supabase
            .from('transactions')
            .update({ next_retry_at: nextRetryAt })
            .eq('id', tx.id);
            
          console.log(`[Reconciliation] Transaction ${tx.id} still pending. Scheduled retry at ${nextRetryAt}`);
        }
      } catch (err: any) {
        console.error(`[Reconciliation] Error checking Kyanda status for ${tx.id}:`, err.message);
        // We do not fail the transaction immediately on a network/API error from Kyanda.
        // We will retry next time.
      }
    }

    console.log('[Reconciliation] Run complete.');
  }
}
