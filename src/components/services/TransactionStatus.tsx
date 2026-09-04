import React from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PaymentState, OrderPayload } from "@/lib/payment";
import { TokenResult } from "@/components/services/TokenResult";

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

  // PENDING & PROCESSING
  if (status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING") {
    let title = "Initiating Payment...";
    let description = "We've received your request and are waiting for the service provider to confirm it.";
    
    if (status === "CONFIRMED") {
      title = "Payment Confirmed";
      description = "We have received your payment. Processing your service now.";
    } else if (status === "PROCESSING") {
      title = "Vending Service";
      description = "Communicating with the provider to vend your requested service.";
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Loader2 className="w-20 h-20 text-primary animate-spin relative z-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
          <p className="text-sm text-primary font-medium animate-pulse mt-4">Your transaction is being processed.</p>
        </div>
        {reference && (
          <div className="pt-4 border-t border-border/50 w-full max-w-xs mx-auto text-sm text-muted-foreground">
            Transaction ID: <span className="font-mono">{reference}</span>
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
        <div className="space-y-8">
          <TokenResult 
            token={receiptData.token} 
            amount={order.amount} 
            units={parseFloat((order.amount / 25.5).toFixed(1))} // Mock calculation
          />
          <div className="flex justify-center gap-4">
            <Link href="/services" className={cn(buttonVariants({ variant: "outline" }))}>
              Buy Another Service
            </Link>
            <Link href={`/receipt/${reference || ""}`} className={cn(buttonVariants())}>
              View Receipt
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
          <CheckCircle2 className="w-20 h-20 text-green-500 relative z-10" />
        </div>
        <div className="space-y-2 w-full">
          <h2 className="text-2xl font-bold text-foreground">Transaction Successful!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Your {order.serviceName} payment was processed successfully.
          </p>
          
          <div className="bg-secondary/30 rounded-2xl p-4 md:p-6 text-left space-y-4 max-w-md mx-auto border border-border/50">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
               <span className="text-muted-foreground text-sm">Status</span>
               <span className="bg-green-500/10 text-green-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide">Paid</span>
            </div>
            <div className="flex justify-between items-center text-sm">
               <span className="text-muted-foreground">Service</span>
               <span className="font-medium text-foreground">{order.serviceName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
               <span className="text-muted-foreground">Destination</span>
               <span className="font-medium text-foreground">{order.destination}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
               <span className="text-muted-foreground">Amount Paid</span>
               <span className="font-medium text-foreground">KES {(order.amount + order.fees).toFixed(2)}</span>
            </div>
            {reference && (
              <div className="flex justify-between items-center text-sm pt-3 border-t border-dashed border-border/50">
                 <span className="text-muted-foreground">QasiNet ID</span>
                 <span className="font-mono font-medium text-foreground">{reference}</span>
              </div>
            )}
            {providerRef && (
              <div className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground">Provider Ref</span>
                 <span className="font-mono font-medium text-foreground">{providerRef}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
          <Link href="/services" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            Done
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
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
          <XCircle className="w-20 h-20 text-destructive relative z-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Transaction Failed</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base">
            We couldn't complete your request.
          </p>
          {message && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 max-w-md mx-auto text-left">
              <span className="font-semibold block mb-1">Reason:</span>
              {message}
            </div>
          )}
          {reference && (
            <p className="text-sm mt-6 text-muted-foreground">
              Reference: <span className="font-mono font-medium">{reference}</span>
            </p>
          )}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/contact" className={cn(buttonVariants({ variant: "outline" }))}>
            Contact Support
          </Link>
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              Try Again <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // TIMEOUT / UNKNOWN
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card border border-border/50 rounded-3xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
        {status === "TIMEOUT" ? (
          <Clock className="w-20 h-20 text-yellow-500 relative z-10" />
        ) : (
          <AlertTriangle className="w-20 h-20 text-yellow-500 relative z-10" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {status === "TIMEOUT" ? "Request Timed Out" : "Status Unknown"}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We haven't received final confirmation from the provider. If your account was charged, the service may still be delivered.
        </p>
        {reference && (
          <p className="text-sm mt-4 text-muted-foreground">
            Reference: <span className="font-mono font-medium">{reference}</span>
          </p>
        )}
      </div>
      <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full justify-center">
        <Link href={`/track?ref=${reference || ""}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Check Status Later
        </Link>
        <Link href="/contact" className={cn(buttonVariants())}>
          Contact Support
        </Link>
      </div>
    </div>
  );
}
