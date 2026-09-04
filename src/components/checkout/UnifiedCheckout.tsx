"use client";

import React, { useState, useEffect, useRef } from "react";
import { OrderPayload, PaymentService, PaymentState } from "@/lib/payment";
import { CheckoutReview } from "./CheckoutReview";
import { TransactionStatus } from "@/components/services/TransactionStatus";
import { Button } from "@/components/ui/Button";
import { detectCarrier } from "@/lib/carrier";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/validation";
import { rememberServiceDestination } from "@/lib/beneficiaries";
import { toast } from "react-hot-toast";

interface UnifiedCheckoutProps {
  order: OrderPayload;
  onEditDetails: () => void;
  onSuccess?: (receiptData: any) => void;
}

type CheckoutPhase = "REVIEW" | "PAYMENT";

export function UnifiedCheckout({ order, onEditDetails, onSuccess }: UnifiedCheckoutProps) {
  const [phase, setPhase] = useState<CheckoutPhase>("REVIEW");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>("IDLE");
  
  // Dedicated M-Pesa Payment Phone State
  const [paymentPhone, setPaymentPhone] = useState<string>(() => {
    const destCarrier = detectCarrier(order.destination || "");
    if (destCarrier.name === "SAFARICOM") {
      return order.destination;
    }
    return order.paymentPhone || "";
  });

  // Load last used M-Pesa phone on mount if paymentPhone is non-Safaricom
  useEffect(() => {
    try {
      const destCarrier = detectCarrier(order.destination || "");
      if (destCarrier.name !== "SAFARICOM") {
        const lastMpesa = localStorage.getItem("qasinet_last_mpesa_phone");
        if (lastMpesa && isValidKenyanPhone(lastMpesa)) {
          setPaymentPhone(lastMpesa);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, [order.destination]);

  // Payment refs
  const [reference, setReference] = useState<string>("");
  const [providerRef, setProviderRef] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [receiptData, setReceiptData] = useState<any>(null);
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<number>(0);

  const handlePay = async () => {
    if (isSubmitting) return; // double-click protection

    const cleanPaymentPhone = normalizeKenyanPhone(paymentPhone);
    if (!isValidKenyanPhone(cleanPaymentPhone)) {
      toast.error("Please enter a valid M-Pesa phone number (e.g. 0712345678)");
      return;
    }

    setIsSubmitting(true);
    
    // Save to recent M-Pesa numbers
    try {
      localStorage.setItem("qasinet_last_mpesa_phone", cleanPaymentPhone);
      const existing = localStorage.getItem("qasinet_recent_mpesa_phones");
      const list: string[] = existing ? JSON.parse(existing) : [];
      const updated = [cleanPaymentPhone, ...list.filter(p => p !== cleanPaymentPhone)].slice(0, 4);
      localStorage.setItem("qasinet_recent_mpesa_phones", JSON.stringify(updated));
    } catch (e) {
      // Ignore
    }

    const finalOrderPayload: OrderPayload = {
      ...order,
      paymentPhone: cleanPaymentPhone
    };

    // Remember destination for this service
    if (order.destination) {
      rememberServiceDestination(order.serviceId, order.destination, order.provider);
    }
    
    try {
      const idempotencyKey = PaymentService.generateIdempotencyKey();
      const initResult = await PaymentService.initiatePayment(finalOrderPayload, idempotencyKey);
      
      setReference(initResult.reference);
      setPhase("PAYMENT");
      setPaymentState("PENDING");
      
      // Start polling status
      attemptRef.current = 0;
      pollStatus(initResult.reference);
    } catch (err: any) {
      setPhase("PAYMENT");
      setPaymentState("FAILED");
      setErrorMessage(err.message || "Could not initiate payment. Please try again later.");
    }
  };

  const pollStatus = (ref: string) => {
    pollingTimerRef.current = setTimeout(async () => {
      attemptRef.current += 1;
      try {
        const result = await PaymentService.checkStatus(ref, attemptRef.current);
        setPaymentState(result.state);
        
        if (result.message) setErrorMessage(result.message);
        if (result.providerRef) setProviderRef(result.providerRef);

        if (result.state === "PENDING" || result.state === "CONFIRMED" || result.state === "PROCESSING") {
          // Continue polling if still in progress (max 30 attempts * 4s = 120s)
          if (attemptRef.current < 30) {
            pollStatus(ref);
          } else {
             setPaymentState("TIMEOUT");
          }
        } else if (result.state === "SUCCESS") {
           // If we have receipt data, store it
           if (result.receiptData) {
             setReceiptData(result.receiptData);
             if (onSuccess) {
               onSuccess(result.receiptData);
             }
           } else if (onSuccess) {
             onSuccess({});
           }
        }
      } catch (err) {
        // Continue polling if network error, unless we hit max
        if (attemptRef.current < 30) {
          pollStatus(ref);
        } else {
          setPaymentState("UNKNOWN");
        }
      }
    }, 4000); // 4 seconds between polls
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  const totalAmount = order.amount + order.fees;
  const isPayValid = isValidKenyanPhone(paymentPhone);

  if (phase === "PAYMENT") {
    return (
      <div className="animate-in zoom-in-95 duration-500">
        <TransactionStatus 
          status={paymentState}
          order={{ ...order, paymentPhone }}
          reference={reference}
          providerRef={providerRef}
          message={errorMessage}
          receiptData={receiptData}
          onRetry={() => {
            setIsSubmitting(false);
            setPhase("REVIEW");
            setPaymentState("IDLE");
          }}
        />
      </div>
    );
  }

  // REVIEW Phase
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-1">
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Review & Pay with M-Pesa</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Confirm recipient details and enter your M-Pesa PIN when prompted.</p>
      </div>
      
      <CheckoutReview 
        order={order} 
        paymentPhone={paymentPhone}
        onPaymentPhoneChange={setPaymentPhone}
      />
      
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-2">
        <Button 
          onClick={onEditDetails} 
          variant="outline" 
          size="lg"
          disabled={isSubmitting}
          className="rounded-2xl"
        >
          Edit Details
        </Button>
        <Button 
          onClick={handlePay} 
          disabled={isSubmitting || !isPayValid}
          size="lg" 
          className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-base sm:text-lg h-14 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
              <span>Initiating STK Push...</span>
            </div>
          ) : (
            `Pay KES ${totalAmount.toFixed(2)} with M-Pesa`
          )}
        </Button>
      </div>
    </div>
  );
}

