import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface SummaryItem {
  label: string;
  value: React.ReactNode;
}

interface BillSummaryProps {
  items: SummaryItem[];
  sellingPrice: number;
  fees?: number;
  className?: string;
}

export function BillSummary({ items, sellingPrice, fees = 0, className }: BillSummaryProps) {
  const totalAmount = sellingPrice + fees;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm", className)}>
      <div className="p-6 space-y-4">
        <h3 className="font-semibold text-lg border-b border-border/50 pb-4">Order Summary</h3>
        
        <div className="space-y-3 pt-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-start text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-right ml-4 text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-dashed border-border/50 space-y-2">
           <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">KES {sellingPrice}</span>
           </div>
           {fees > 0 && (
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Convenience Fee</span>
                <span className="font-medium">KES {fees}</span>
             </div>
           )}
        </div>
      </div>
      
      <div className="bg-secondary/30 p-6 border-t border-border/50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold">Total Payable</span>
          <span className="text-2xl font-bold text-primary">KES {totalAmount}</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Secure checkout via Mobile Money</span>
        </div>
      </div>
    </div>
  );
}
