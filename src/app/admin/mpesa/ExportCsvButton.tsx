"use client";

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export interface MpesaCsvRow {
  mpesa_receipt: string;
  qsn_reference: string;
  payer_phone: string;
  recipient_destination: string;
  confirmed_at: string;
  service_type: string;
  service_name: string;
  amount: number;
  status: string;
  transaction_id: string;
}

interface ExportCsvButtonProps {
  rows: MpesaCsvRow[];
  filenamePrefix?: string;
  totalFilteredCount?: number;
}

export function ExportCsvButton({
  rows,
  filenamePrefix = 'qasinet_mpesa_reconciliation',
  totalFilteredCount,
}: ExportCsvButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!rows || rows.length === 0) return;
    setExporting(true);

    try {
      const headers = [
        'M-Pesa Receipt Code',
        'Payer Phone',
        'Recipient Destination',
        'Confirmed At (EAT/UTC+3)',
        'Service Type',
        'Service Name',
        'Amount (KES)',
        'Status',
        'QasiNet Reference',
        'Transaction ID'
      ];

      const csvRows = [headers.join(',')];

      for (const r of rows) {
        const row = [
          escapeCsvValue(r.mpesa_receipt),
          escapeCsvValue(r.payer_phone),
          escapeCsvValue(r.recipient_destination),
          escapeCsvValue(r.confirmed_at),
          escapeCsvValue(r.service_type),
          escapeCsvValue(r.service_name),
          r.amount,
          escapeCsvValue(r.status),
          escapeCsvValue(r.qsn_reference),
          escapeCsvValue(r.transaction_id)
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
      const downloadLink = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      downloadLink.setAttribute('href', csvContent);
      downloadLink.setAttribute('download', `${filenamePrefix}_${today}.csv`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  function escapeCsvValue(val: string | null | undefined): string {
    if (!val) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || rows.length === 0}
      title="Export visible/filtered M-Pesa transactions to CSV"
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>
        Export CSV {totalFilteredCount !== undefined ? `(${totalFilteredCount})` : `(${rows.length})`}
      </span>
    </button>
  );
}
