"use client";

import React, { useState, useEffect, useRef } from "react";
import { OrderPayload, PaymentService, PaymentState } from "@/lib/payment";
import { CheckoutReview } from "./CheckoutReview";
import { TransactionStatus } from "@/components/services/TransactionStatus";
import { Button } from "@/components/ui/Button";

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
  
  // Payment refs
  const [reference, setReference] = useState<string>("");
  const [providerRef, setProviderRef] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [receiptData, setReceiptData] = useState<any>(null);
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<number>(0);

  const handlePay = async () => {
    if (isSubmitting) return; // double-click protection
    setIsSubmitting(true);
    
    try {
      const idempotencyKey = PaymentService.generateIdempotencyKey();
      const initResult = await PaymentService.initiatePayment(order, idempotencyKey);
      
      setReference(initResult.reference);
      setPhase("PAYMENT");
      setPaymentState("PENDING");
      
      // Start polling status
      attemptRef.current = 0;
      pollStatus(initResult.reference);
    } catch (err) {
      setPhase("PAYMENT");
      setPaymentState("FAILED");
      setErrorMessage("Could not initiate payment. Please try again later.");
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
          // Continue polling if still in progress
          if (attemptRef.current < 6) {
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
        // If polling fails randomly, we assume unknown
        setPaymentState("UNKNOWN");
      }
    }, 2000);
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

  if (phase === "PAYMENT") {
    return (
      <div className="animate-in zoom-in-95 duration-500">
        <TransactionStatus 
          status={paymentState}
          order={order}
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
      <h2 className="text-xl font-semibold px-2">Review & Confirm</h2>
      
      <CheckoutReview order={order} />
      
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4">
        <Button 
          onClick={onEditDetails} 
          variant="outline" 
          size="lg"
          disabled={isSubmitting}
        >
          Edit Details
        </Button>
        <Button 
          onClick={handlePay} 
          disabled={isSubmitting}
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg h-14 px-8 shadow-lg shadow-primary/25"
        >
          {isSubmitting ? "Processing..." : `Pay KES ${totalAmount.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
