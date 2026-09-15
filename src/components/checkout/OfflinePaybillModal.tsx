"use client";

import React, { useState } from "react";
import { OrderPayload } from "@/lib/payment";
import { Copy, Check, Smartphone, Clock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

interface OfflinePaybillModalProps {
  order: OrderPayload;
  paymentPhone: string;
  onQueueSTK: () => void;
  onClose: () => void;
}

export function OfflinePaybillModal({ order, paymentPhone, onQueueSTK, onClose }: OfflinePaybillModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Paybill Number: read from public env or fallback to business paybill default
  const paybillNumber = process.env.NEXT_PUBLIC_MPESA_PAYBILL_NUMBER || "522522";

  // Self-describing account reference
  const resolveAccountReference = (): string => {
    const dest = order.destination || paymentPhone;
    if (order.serviceId.includes("data")) {
      const code = order.productId || `${order.amount}KES`;
      return `${code}*${dest}`;
    }
    if (order.serviceId.includes("airtime")) {
      return `AIR*${dest}`;
    }
    if (order.serviceId.includes("kplc") || order.serviceId.includes("electricity")) {
      return `ELEC*${dest}`;
    }
    if (order.serviceId.includes("water")) {
      return `WTR*${dest}`;
    }
    if (order.serviceId.includes("dstv") || order.serviceId.includes("gotv") || order.serviceId.includes("zuku") || order.serviceId.includes("startimes")) {
      return `TV*${dest}`;
    }
    return `QSN*${dest}`;
  };

  const accountReference = resolveAccountReference();
  const totalAmount = order.amount + order.fees;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`Copied ${fieldName} to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-foreground">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Smartphone className="w-3.5 h-3.5" /> Offline M-Pesa Checkout
          </div>
          <h3 className="text-xl font-black tracking-tight">Zero Mobile Data? Pay via M-Pesa USSD</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            M-Pesa operates over your SIM card&apos;s cellular signal and uses zero mobile internet data. Dial the USSD menu and paste the details below:
          </p>
        </div>

        {/* Step-by-Step Payment Instructions */}
        <div className="space-y-3 bg-muted/20 border border-border/40 p-4 rounded-2xl">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Paybill Payment Details
          </div>

          {/* Business No */}
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/40">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground font-bold">Business / Paybill No</div>
              <div className="text-base font-black font-mono tracking-wider text-emerald-400">{paybillNumber}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(paybillNumber, "Business No")}
              className="h-8 px-3 rounded-lg text-xs gap-1"
            >
              {copiedField === "Business No" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "Business No" ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Account No */}
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/40">
            <div className="truncate mr-2">
              <div className="text-[10px] uppercase text-muted-foreground font-bold">Account Number</div>
              <div className="text-base font-black font-mono tracking-wider text-foreground truncate">{accountReference}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(accountReference, "Account No")}
              className="h-8 px-3 rounded-lg text-xs gap-1 flex-shrink-0"
            >
              {copiedField === "Account No" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "Account No" ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/40">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground font-bold">Amount to Pay</div>
              <div className="text-base font-black font-mono tracking-wider text-foreground">KES {totalAmount.toFixed(0)}</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(totalAmount.toFixed(0), "Amount")}
              className="h-8 px-3 rounded-lg text-xs gap-1"
            >
              {copiedField === "Amount" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === "Amount" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Steps Guidance */}
        <div className="text-xs text-muted-foreground space-y-1.5 px-1 leading-relaxed">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> How to complete in M-Pesa:
          </div>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>On your phone, dial <strong className="text-emerald-400 font-mono">*334#</strong> (or open SIM Toolkit $\rightarrow$ M-Pesa).</li>
            <li>Select <strong>Lipa na M-Pesa</strong> $\rightarrow$ <strong>Pay Bill</strong>.</li>
            <li>Enter Business No: <strong>{paybillNumber}</strong>.</li>
            <li>Enter Account No: <strong>{accountReference}</strong>.</li>
            <li>Enter Amount: <strong>KES {totalAmount.toFixed(0)}</strong> and enter your M-Pesa PIN.</li>
          </ol>
          <p className="pt-1 text-[11px] text-muted-foreground">
            Once confirmed, our server receives the payment via Safaricom&apos;s GSM network and vends your bundle instantly.
          </p>
        </div>

        {/* Alternative: Queue STK Push */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            onClick={onQueueSTK}
            variant="outline"
            className="w-full rounded-2xl text-xs sm:text-sm font-semibold h-11 border-border/60 gap-1.5"
          >
            <Clock className="w-4 h-4 text-cyan-400" /> Queue for Auto-STK Push
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-2xl text-xs sm:text-sm h-11"
          >
            Done / Copied
          </Button>
        </div>

      </div>
    </div>
  );
}
