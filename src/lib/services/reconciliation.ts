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
    
    // Find VENDING_PENDING transactions where next_retry_at is due (or NULL)
    // Safety net: Poll transactions that have been in VENDING_PENDING for ~5-10 minutes,
    // to give the primary IPN callback time to arrive first.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: pendingTxs, error } = await this.supabase
      .from('transactions')
      .select('id, kyanda_reference, status, created_at, next_retry_at')
      .eq('status', 'VENDING_PENDING')
      .lte('created_at', fiveMinAgo)
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
        // If customer paid via M-Pesa but no Kyanda ref was obtained after 15 minutes,
        // flag for refund review rather than leaving silently stuck.
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (new Date(tx.created_at) < fifteenMinAgo) {
          await this.orchestrator.markVendingFailedRefundPending(
            tx.id,
            'No Kyanda provider reference obtained after 15 minutes'
          );
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

        // Extract any tokens, units, receipts returned by checkTransactionStatus
        const rawRes: any = response;
        const rawDetails: any = details;
        const token = rawRes?.Token || rawRes?.token || rawDetails?.Token || rawDetails?.token || rawDetails?.token_code;
        const units = rawRes?.Units || rawRes?.units || rawDetails?.Units || rawDetails?.units;
        const receipt = rawRes?.Receipt || rawRes?.receipt || rawDetails?.Receipt || rawDetails?.receipt;

        const metadata: any = {};
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
      } catch (err: any) {
        console.error(`[Reconciliation] Error checking Kyanda status for ${tx.id}:`, err.message);
        // We do not fail the transaction immediately on a network/API error from Kyanda.
        // We will retry next time.
      }
    }

    console.log('[Reconciliation] Run complete.');
  }
}
