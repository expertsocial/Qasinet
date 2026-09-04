import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Smartphone, Check, AlertCircle, Sparkles, CreditCard, User, History } from "lucide-react";
import Image from "next/image";
import { OrderPayload } from "@/lib/payment";
import { detectCarrier } from "@/lib/carrier";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/validation";

interface CheckoutReviewProps {
  order: OrderPayload;
  paymentPhone: string;
  onPaymentPhoneChange: (phone: string) => void;
  className?: string;
}

export function CheckoutReview({ 
  order, 
  paymentPhone, 
  onPaymentPhoneChange, 
  className 
}: CheckoutReviewProps) {
  const [recentPhones, setRecentPhones] = useState<string[]>([]);
  const [isEditingPaymentPhone, setIsEditingPaymentPhone] = useState(false);

  const totalAmount = order.amount + order.fees;

  // Destination Carrier Detection
  const destCarrier = detectCarrier(order.destination);
  const isDestSafaricom = destCarrier.name === "SAFARICOM";

  // Paying Phone Carrier Detection
  const payCarrier = detectCarrier(paymentPhone);
  const isPaySafaricom = payCarrier.name === "SAFARICOM";
  const isPayValid = isValidKenyanPhone(paymentPhone);

  // Load recent M-Pesa numbers
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qasinet_recent_mpesa_phones");
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentPhones(parsed.slice(0, 3));
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // If destination is not Safaricom, ensure payment phone editor is open
  useEffect(() => {
    if (!isDestSafaricom && (!paymentPhone || paymentPhone === order.destination)) {
      setIsEditingPaymentPhone(true);
    }
  }, [isDestSafaricom, order.destination, paymentPhone]);

  return (
    <div className={cn("rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm space-y-6", className)}>
      <div className="p-6 space-y-6">
        
        {/* Merchant Branding Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-secondary flex items-center justify-center p-1 border border-border/40">
              <Image src="/logos/qasinet-logo.jpeg" alt="QasiNet" fill sizes="40px" className="object-cover" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-foreground flex items-center gap-1.5">
                QasiNet
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 rounded">Instant Pay</span>
              </h3>
              <p className="text-xs text-muted-foreground">{order.serviceName} Checkout</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-mono">Payable</div>
            <div className="text-lg sm:text-xl font-black text-primary font-mono">KES {totalAmount.toFixed(2)}</div>
          </div>
        </div>
        
        {/* 1. SERVICE RECIPIENT CARD */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              Service Recipient / Destination
            </span>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-sm", destCarrier.badgeBg, destCarrier.borderBg)}>
              <span className="relative w-3.5 h-3.5 rounded-full overflow-hidden bg-white shrink-0 inline-block">
                <Image 
                  src={destCarrier.logoSrc} 
                  alt={destCarrier.displayName} 
                  fill 
                  sizes="14px"
                  className="object-contain p-0.5" 
                />
              </span>
              <span>{destCarrier.displayName}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{order.provider || destCarrier.displayName} ({order.serviceName})</p>
              <p className="text-base font-black font-mono tracking-wide text-foreground">{order.destination}</p>
            </div>
            {order.metadata?.package && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Package</p>
                <p className="text-sm font-semibold text-foreground">{order.metadata.package}</p>
              </div>
            )}
            {order.metadata?.accountName && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Account Name</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1 justify-end">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {order.metadata.accountName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. M-PESA PAYMENT PHONE NUMBER CARD */}
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">M-Pesa Payment Number</h4>
                <p className="text-[11px] text-muted-foreground">STK PIN prompt will be sent to this phone</p>
              </div>
            </div>

            {isDestSafaricom && !isEditingPaymentPhone && (
              <button
                type="button"
                onClick={() => setIsEditingPaymentPhone(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors self-start sm:self-auto"
              >
                Pay with different M-Pesa line
              </button>
            )}
          </div>

          {/* Quick Notice for non-Safaricom numbers */}
          {!isDestSafaricom && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p>
                Delivering to <strong>{destCarrier.displayName} ({order.destination})</strong>. Please enter your <strong>Safaricom M-Pesa number</strong> below to complete payment.
              </p>
            </div>
          )}

          {/* Payment Phone Input */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="tel"
                value={paymentPhone}
                onChange={(e) => onPaymentPhoneChange(e.target.value)}
                placeholder="e.g. 0722 123 456"
                className={cn(
                  "w-full bg-background border rounded-xl pl-4 pr-24 py-3 font-mono text-sm sm:text-base font-bold text-foreground focus:outline-none transition-all shadow-inner",
                  isPayValid ? "border-emerald-500/50 focus:border-emerald-500 ring-1 ring-emerald-500/20" : "border-border/60 focus:border-primary"
                )}
              />
              <div className="absolute right-3 top-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider",
                  isPaySafaricom ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-secondary text-muted-foreground"
                )}>
                  {isPaySafaricom ? "M-Pesa ✓" : payCarrier.displayName}
                </span>
              </div>
            </div>

            {/* Validation helper text */}
            {paymentPhone && !isPayValid && (
              <p className="text-xs text-red-400 font-medium">Please enter a valid 10-digit mobile number (e.g. 0712345678).</p>
            )}
            {paymentPhone && isPayValid && !isPaySafaricom && (
              <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                M-Pesa STK push requires a Safaricom number. Ensure this line can receive M-Pesa prompts.
              </p>
            )}

            {/* Recent M-Pesa Numbers Chips */}
            {recentPhones.length > 0 && (
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <History className="w-3 h-3" /> Recent:
                </span>
                {recentPhones.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPaymentPhoneChange(p)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium transition-all",
                      paymentPhone === p 
                        ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30" 
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Cost Breakdown */}
        <div className="pt-2 border-t border-dashed border-border/60 space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-muted-foreground">Service Amount</span>
            <span className="font-semibold text-foreground font-mono">KES {order.amount.toFixed(2)}</span>
          </div>
          {order.fees > 0 && (
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted-foreground">Convenience Fee</span>
              <span className="font-semibold text-foreground font-mono">KES {order.fees.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Total Section Footer */}
      <div className="bg-secondary/40 p-5 sm:p-6 border-t border-border/60">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total to Pay</span>
            <p className="text-xs text-muted-foreground">No hidden charges</p>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight">
            KES {totalAmount.toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2 border-t border-border/30">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted M-Pesa Daraja payment pipeline by QasiNet</span>
        </div>
      </div>
    </div>
  );
}
