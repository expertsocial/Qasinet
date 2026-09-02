import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import { OrderPayload } from "@/lib/payment";

interface CheckoutReviewProps {
  order: OrderPayload;
  className?: string;
}

export function CheckoutReview({ order, className }: CheckoutReviewProps) {
  const totalAmount = order.amount + order.fees;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm", className)}>
      <div className="p-6 space-y-6">
        
        {/* Header / Merchant */}
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="relative w-10 h-10 overflow-hidden rounded-md bg-secondary flex items-center justify-center p-1">
             <Image src="/logos/WhatsApp image.jpeg" alt="QasiNet" fill className="object-cover" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">QasiNet</h3>
            <p className="text-xs text-muted-foreground">{order.serviceName} Payment</p>
          </div>
        </div>
        
        {/* Order Details */}
        <div className="space-y-4 pt-2">
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium text-foreground">{order.provider}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
            <span className="text-muted-foreground">Destination Account</span>
            <span className="font-medium text-foreground">{order.destination}</span>
          </div>

          {order.metadata?.package && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium text-foreground">{order.metadata.package}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
            <span className="text-muted-foreground">Paying Phone</span>
            <span className="font-medium text-foreground">{order.paymentPhone}</span>
          </div>
          
        </div>
        
        {/* Cost Breakdown */}
        <div className="pt-4 border-t border-dashed border-border/50 space-y-2">
           <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">KES {order.amount.toFixed(2)}</span>
           </div>
           {order.fees > 0 && (
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Convenience Fee</span>
                <span className="font-medium">KES {order.fees.toFixed(2)}</span>
             </div>
           )}
        </div>
      </div>
      
      {/* Total Section */}
      <div className="bg-secondary/30 p-6 border-t border-border/50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold">Total Payable</span>
          <span className="text-2xl font-bold text-primary">KES {totalAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>Secure checkout processed by QasiNet</span>
        </div>
      </div>
    </div>
  );
}
