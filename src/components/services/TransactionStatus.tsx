"use client";

import React, { useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Clock, AlertTriangle, Smartphone, ShieldCheck, Sparkles, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PaymentState, OrderPayload } from "@/lib/payment";
import { TokenResult } from "@/components/services/TokenResult";
import confetti from "canvas-confetti";
import { sounds } from "@/lib/sounds";

interface TransactionStatusProps {
  status: PaymentState;
  order: OrderPayload;
  reference?: string;
  providerRef?: string;
  message?: string;
  receiptData?: any;
  onRetry?: () => void;
}

export function TransactionStatus({
  status,
  order,
  reference,
  providerRef,
  message,
  receiptData,
  onRetry,
}: TransactionStatusProps) {

  // Trigger celebration & sounds on status transitions
  useEffect(() => {
    if (status === "SUCCESS") {
      sounds.playSuccessChime();
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']
        });

        // Save recipient to recent phone history in localStorage
        if (order.destination && /^\d+$/.test(order.destination.replace(/\D/g, ''))) {
          const raw = localStorage.getItem("qsn_recent_phones");
          const existing: string[] = raw ? JSON.parse(raw) : [];
          const updated = [order.destination, ...existing.filter(p => p !== order.destination)].slice(0, 4);
          localStorage.setItem("qsn_recent_phones", JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    } else if (status === "FAILED" || status === "TIMEOUT") {
      sounds.playWarningChime();
    }
  }, [status, order.destination]);

  // PENDING & PROCESSING - High-Tech Animated Radar
  if (status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING") {
    let title = "Waiting for M-Pesa PIN...";
    let description = `A prompt of KES ${(order.amount + (order.fees || 0)).toLocaleString()} has been sent to your phone ${order.destination}.`;
    let step = 1;
    
    if (status === "CONFIRMED") {
      title = "Payment Received!";
      description = "M-Pesa payment confirmed. Preparing to dispatch your service.";
      step = 2;
    } else if (status === "PROCESSING") {
      title = "Vending Utility...";
      description = "Dispatched to provider network. Generating your receipt and token.";
      step = 3;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
        {/* Glowing Radar Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Radar Animation Ring */}
        <div className="relative flex items-center justify-center w-28 h-28 my-2">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-75" />
          <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary relative z-10 shadow-lg shadow-primary/20">
            <Smartphone className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Step-by-Step Progress Indicator */}
        <div className="flex items-center gap-2 max-w-xs mx-auto text-xs font-semibold">
          <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-neutral-800")} />
          <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-neutral-800")} />
          <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-neutral-800")} />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Do not close this page while processing</span>
          </div>
        </div>

        {reference && (
          <div className="pt-4 border-t border-border/50 w-full max-w-xs mx-auto text-xs text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{reference}</span>
          </div>
        )}
      </div>
    );
  }

  // SUCCESS
  if (status === "SUCCESS") {
    // Special case for Electricity prepaid tokens
    if (order.serviceId === "electricity" && receiptData?.token) {
      return (
        <div className="space-y-6">
          <TokenResult 
            token={receiptData.token} 
            amount={order.amount} 
            units={receiptData.units || parseFloat((order.amount / 25.5).toFixed(1))}
            meterNumber={order.destination}
            customerName={receiptData.customer_name}
          />
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/services" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
              Buy Another Utility
            </Link>
            <Link href={`/receipt/${reference || ""}`} className={cn(buttonVariants(), "flex-1")}>
              View Receipt
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative z-10 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-2 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Vended Successfully
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Transaction Complete!</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your {order.serviceName} of KES {order.amount.toLocaleString()} was credited to {order.destination}.
          </p>
          
          <div className="bg-secondary/30 rounded-2xl p-4 md:p-6 text-left space-y-3.5 max-w-md mx-auto border border-border/50 mt-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-border/50">
               <span className="text-muted-foreground text-xs font-medium">Status</span>
               <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Paid &amp; Delivered</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="text-muted-foreground font-medium">Service</span>
               <span className="font-semibold text-foreground">{order.serviceName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="text-muted-foreground font-medium">Recipient / Account</span>
               <span className="font-mono font-semibold text-foreground">{order.destination}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="text-muted-foreground font-medium">Total Paid</span>
               <span className="font-bold text-emerald-400 text-sm">KES {(order.amount + (order.fees || 0)).toFixed(2)}</span>
            </div>
            {reference && (
              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-dashed border-border/50">
                 <span className="text-muted-foreground font-medium">QasiNet Reference</span>
                 <span className="font-mono font-bold text-foreground">{reference}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full justify-center max-w-md mx-auto">
          <Link href="/services" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            Buy Another Service
          </Link>
          <Link href={`/receipt/${reference || ""}`} className={cn(buttonVariants(), "flex-1")}>
            View Receipt
          </Link>
        </div>
      </div>
    );
  }

  // FAILED
  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
          <XCircle className="w-16 h-16 text-destructive relative z-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Transaction Incomplete</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            We couldn't finalize your transaction.
          </p>
          {message && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive text-xs font-medium rounded-2xl border border-destructive/20 max-w-md mx-auto text-left">
              <span className="font-bold block mb-1">Error Details:</span>
              {message}
            </div>
          )}
          {reference && (
            <p className="text-xs mt-4 text-muted-foreground">
              Reference: <span className="font-mono font-medium text-foreground">{reference}</span>
            </p>
          )}
        </div>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full justify-center max-w-xs mx-auto">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2 flex-1">
              Try Again <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Link href="/support" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            Support
          </Link>
        </div>
      </div>
    );
  }
  
  // TIMEOUT / UNKNOWN
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
        {status === "TIMEOUT" ? (
          <Clock className="w-16 h-16 text-yellow-500 relative z-10" />
        ) : (
          <AlertTriangle className="w-16 h-16 text-yellow-500 relative z-10" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {status === "TIMEOUT" ? "Request Timed Out" : "Awaiting Confirmation"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          The network response is taking longer than expected. If your M-Pesa account was charged, the service will be delivered automatically.
        </p>
        {reference && (
          <p className="text-xs mt-3 text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{reference}</span>
          </p>
        )}
      </div>
      <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full justify-center max-w-xs mx-auto">
        <Link href={`/track?ref=${reference || ""}`} className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
          Track Status
        </Link>
        <Link href="/support" className={cn(buttonVariants(), "flex-1")}>
          Help
        </Link>
      </div>
    </div>
  );
}
