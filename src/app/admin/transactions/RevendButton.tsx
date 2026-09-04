'use client';

import React, { useState } from 'react';
import { Play, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RevendButtonProps {
  transactionId: string;
  qsnReference: string;
  status: string;
  hasPaymentRef: boolean;
  className?: string;
}

export function RevendButton({
  transactionId,
  qsnReference,
  status,
  hasPaymentRef,
  className = ''
}: RevendButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Eligible for re-vend if it has a payment reference and is in a failed/timeout/pending state
  const isFailedOrPending = [
    'VENDING_FAILED',
    'TIMEOUT',
    'UNKNOWN',
    'PAYMENT_CONFIRMED',
    'PAYMENT_PENDING'
  ].includes(status);

  if (!isFailedOrPending && status === 'SUCCESS') {
    return null;
  }

  const handleRevend = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to re-vend ${qsnReference} to Kyanda?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/revend`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Re-vend failed');
      }

      setResult({ success: true, message: data.message || 'Re-vend succeeded!' });
      router.refresh();
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to re-vend' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleRevend}
        disabled={loading}
        title="Retry vending this transaction to Kyanda immediately"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
          loading
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
            : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/10 active:scale-95'
        } ${className}`}
      >
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
        <span>{loading ? 'Vending...' : 'Re-Vend'}</span>
      </button>

      {result && (
        <span
          className={`text-[11px] font-medium flex items-center gap-1 ${
            result.success ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          ) : (
            <AlertCircle className="w-3 h-3 shrink-0" />
          )}
          <span className="truncate max-w-[140px]" title={result.message}>
            {result.success ? 'Vended!' : result.message}
          </span>
        </span>
      )}
    </div>
  );
}
