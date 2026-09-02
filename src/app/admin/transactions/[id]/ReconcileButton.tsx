"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReconcileButtonProps {
  transactionId: string;
}

export function ReconcileButton({ transactionId }: ReconcileButtonProps) {
  const [isReconciling, setIsReconciling] = useState(false);
  const [result, setResult] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleReconcile = async () => {
    setIsReconciling(true);
    setResult('IDLE');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/reconcile`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResult('SUCCESS');
        setMessage(data.message || 'Reconciled successfully');
        // Refresh the page data
        router.refresh();
      } else {
        setResult('ERROR');
        setMessage(data.error || 'Reconciliation failed');
      }
    } catch (error: any) {
      setResult('ERROR');
      setMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button 
        onClick={handleReconcile} 
        disabled={isReconciling}
        variant="outline"
        className="bg-neutral-900 border-neutral-700 hover:bg-neutral-800 text-neutral-300"
      >
        <RefreshCw size={16} className={`mr-2 ${isReconciling ? 'animate-spin' : ''}`} />
        {isReconciling ? 'Reconciling...' : 'Manual Reconcile'}
      </Button>
      {result !== 'IDLE' && (
        <div className={`text-sm flex items-center gap-1.5 ${result === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
          {result === 'SUCCESS' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
