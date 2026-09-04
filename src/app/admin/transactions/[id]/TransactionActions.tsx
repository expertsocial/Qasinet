'use client';

import React, { useState } from 'react';
import { RefreshCw, Play, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TransactionActionsProps {
  transactionId: string;
  qsnReference: string;
  status: string;
  hasKyandaRef: boolean;
  hasPaymentRef: boolean;
}

export function TransactionActions({ 
  transactionId, 
  qsnReference, 
  status, 
  hasKyandaRef, 
  hasPaymentRef 
}: TransactionActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReconcile = async () => {
    setLoadingAction('reconcile');
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/reconcile`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reconciliation failed');
      setFeedback({ type: 'success', message: data.message || 'Transaction reconciled successfully' });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevend = async () => {
    if (!confirm('Are you sure you want to re-vend this transaction to Kyanda?')) return;
    setLoadingAction('revend');
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/revend`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-vend failed');
      setFeedback({ type: 'success', message: data.message });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const canReconcile = hasKyandaRef && !['SUCCESS', 'VENDING_FAILED', 'REVERSED'].includes(status);
  const canRevend = hasPaymentRef && ['VENDING_FAILED', 'TIMEOUT', 'UNKNOWN', 'PAYMENT_CONFIRMED'].includes(status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {canReconcile && (
          <button
            onClick={handleReconcile}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'reconcile' ? 'animate-spin' : ''}`} />
            <span>Reconcile with Kyanda</span>
          </button>
        )}

        {canRevend && (
          <button
            onClick={handleRevend}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${loadingAction === 'revend' ? 'animate-spin' : ''}`} />
            <span>Retry Vending (Re-Vend)</span>
          </button>
        )}

        <Link
          href={`/receipt/${qsnReference}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Customer Receipt</span>
        </Link>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
