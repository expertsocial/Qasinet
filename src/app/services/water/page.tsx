"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PhoneInput } from "@/components/services/PhoneInput";
import { AmountSelector } from "@/components/services/AmountSelector";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AccountNumberInput } from "@/components/services/AccountNumberInput";
import { ArrowLeft, ArrowRight, Droplets, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";

type Step = 1 | 2 | 3;

export default function WaterPage() {
  const [step, setStep] = useState<Step>(1);
  
  // Account & Amount Details
  const [accountNumber, setAccountNumber] = useState("");
  const [isAccountValid, setIsAccountValid] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  
  // Payment Details
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const handleNext = () => setStep((s) => Math.min(s + 1, 3) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const isAmountValid = amount >= 50 && Number.isInteger(amount);
  const isStep1Valid = isAccountValid && isAmountValid;
  const isStep2Valid = isPhoneValid && isValidKenyanPhone(phone);

  const orderPayload: OrderPayload = {
    serviceId: "nairobi-water",
    serviceName: "Nairobi Water Bill",
    provider: "Nairobi Water",
    destination: accountNumber.trim(),
    amount: Math.round(amount),
    fees: 0,
    paymentPhone: phone,
    metadata: {
      accountNumber: accountNumber.trim(),
      utilityProvider: "NAIROBI_WTR",
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="container max-w-3xl mx-auto px-4">
        
        {/* Header */}
        {step < 3 && (
          <div className="mb-8">
            <Link 
              href="/services" 
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2 text-muted-foreground")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-500">
                <Droplets className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Pay Water Bill</h1>
            </div>
            <p className="text-muted-foreground">Settle your Nairobi Water utility bills securely with instant M-Pesa processing.</p>
          </div>
        )}

        {/* Progress Bar */}
        {step < 3 && (
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-primary">1. Account & Amount</span>
              <span className={step >= 2 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>2. Payment</span>
              <span className={step >= 3 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>3. Checkout</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
              <div className="h-full bg-primary transition-all duration-300 w-1/3" />
              <div className={`h-full transition-all duration-300 w-1/3 ${step >= 2 ? "bg-primary" : "bg-transparent"}`} />
              <div className={`h-full transition-all duration-300 w-1/3 ${step >= 3 ? "bg-primary" : "bg-transparent"}`} />
            </div>
          </div>
        )}

        {/* Step 1: Account & Amount */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              
              {/* Provider Badge */}
              <div className="flex items-center gap-3.5 p-3.5 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-card border border-border/50 overflow-hidden relative flex-shrink-0">
                  <Image 
                    src="/logos/water-service-logo.jpg" 
                    alt="Nairobi Water" 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">Nairobi City Water & Sewerage Company</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      NAIROBI_WTR
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Official municipal water bill settlement</p>
                </div>
              </div>

              {/* Water Account Input */}
              <AccountNumberInput
                label="Water Account Number"
                placeholder="e.g. 1234567"
                value={accountNumber}
                onChange={setAccountNumber}
                serviceType="nairobi-water"
                onValidationChange={setIsAccountValid}
              />

              {/* Amount Selection */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <AmountSelector
                  value={amount}
                  onChange={(val) => setAmount(Math.round(val))}
                  minAmount={50}
                  maxAmount={100000}
                  presets={[200, 500, 1000, 2000, 5000]}
                />
                <p className="text-xs text-muted-foreground">
                  Whole-number amount in KES (minimum KES 50).
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleNext} 
                disabled={!isStep1Valid} 
                size="lg" 
                className="w-full sm:w-auto font-semibold px-8"
              >
                Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">M-Pesa Payment Details</h2>
                <p className="text-sm text-muted-foreground">Enter the phone number that will receive the M-Pesa STK prompt.</p>
              </div>

              {/* Order Summary Recap */}
              <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 flex justify-between items-center text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono font-bold text-foreground">{accountNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-cyan-600 dark:text-cyan-400 text-base">KES {amount.toLocaleString()}</p>
                </div>
              </div>

              <PhoneInput 
                value={phone} 
                onChange={setPhone} 
                onValidationChange={setIsPhoneValid} 
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <Button onClick={handleBack} variant="outline" size="lg">
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!isStep2Valid} 
                size="lg"
                className="font-semibold px-8"
              >
                Review &amp; Confirm <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Checkout & Status */}
        {step >= 3 && (
          <UnifiedCheckout 
            order={orderPayload}
            onEditDetails={handleBack}
          />
        )}

      </div>
    </main>
  );
}
