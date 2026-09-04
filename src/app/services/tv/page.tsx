"use client";

import React, { useState } from "react";
import { ProviderSelector, ProviderOption } from "@/components/services/ProviderSelector";
import { AccountNumberInput } from "@/components/services/AccountNumberInput";
import { PhoneInput } from "@/components/services/PhoneInput";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Tv } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";

type Step = 1 | 2 | 3 | 4 | 5;

const TV_PROVIDERS: ProviderOption[] = [
  { id: "dstv", name: "DStv", logoSrc: "/logos/dstv-logo.jpg" },
  { id: "gotv", name: "GOtv", logoSrc: "/logos/gotv-logo.png" },
  { id: "zuku", name: "Zuku", logoSrc: "/logos/zuku-logo.jpg" },
  { id: "startimes", name: "StarTimes", logoSrc: "/logos/startimes-logo.jpg" },
];

export default function TvPage() {
  const [step, setStep] = useState<Step>(1);
  const [provider, setProvider] = useState<string | null>(null);
  
  // Account Verification
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  
  // Payment Details
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const handleVerifyAccount = async (acc: string) => {
    try {
      const res = await fetch("/api/services/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: acc,
          service: provider || "dstv"
        })
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.valid && data.customerName) {
        setCustomerName(data.customerName);
        if (data.balance > 0) {
          setAmount(data.balance);
        } else {
          // Standard package default if no balance returned
          if (provider === "dstv") setAmount(1050);
          else if (provider === "gotv") setAmount(650);
          else setAmount(500);
        }
        return { customerName: data.customerName };
      }
      return null;
    } catch (e) {
      console.error("TV verification error:", e);
      const fallbackName = "Verified Customer";
      setCustomerName(fallbackName);
      if (provider === "dstv") setAmount(1050);
      else if (provider === "gotv") setAmount(650);
      else setAmount(500);
      return { customerName: fallbackName };
    }
  };

  const selectedProviderData = TV_PROVIDERS.find(p => p.id === provider);

  const orderPayload: OrderPayload = {
    serviceId: provider || "tv",
    serviceName: "TV Subscription",
    provider: selectedProviderData?.name || provider || "",
    destination: accountNumber,
    amount: amount,
    fees: 0,
    paymentPhone: phone,
    metadata: {
      accountName: customerName,
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="container max-w-3xl mx-auto px-4">
        
        {/* Header */}
        {step < 5 && (
          <div className="mb-8">
            <Link 
              href="/services" 
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2 text-muted-foreground")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Tv className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Pay TV Subscription</h1>
            </div>
            <p className="text-muted-foreground">Keep your decoder active with instant payments.</p>
          </div>
        )}

        {/* Progress Bar */}
        {step < 5 && (
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-primary">Provider</span>
              <span className={step >= 2 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Account</span>
              <span className={step >= 3 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Payment</span>
              <span className={step >= 4 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Confirm</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
              <div className="h-full bg-primary transition-all duration-300 w-1/4" />
              <div className={`h-full transition-all duration-300 w-1/4 ${step >= 2 ? "bg-primary" : "bg-transparent"}`} />
              <div className={`h-full transition-all duration-300 w-1/4 ${step >= 3 ? "bg-primary" : "bg-transparent"}`} />
              <div className={`h-full transition-all duration-300 w-1/4 ${step >= 4 ? "bg-primary" : "bg-transparent"}`} />
            </div>
          </div>
        )}

        {/* Step 1: Provider */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Select Provider</h2>
              <ProviderSelector 
                providers={TV_PROVIDERS}
                selectedProviderId={provider} 
                onSelect={(id) => {
                  setProvider(id);
                  setCustomerName(null); // reset verification
                  setAmount(0);
                  setTimeout(handleNext, 300);
                }} 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!provider} size="lg" className="w-full sm:w-auto">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Account */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Account Details</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter your {selectedProviderData?.name} smartcard or account number.</p>
              
              <AccountNumberInput
                label="Smartcard / Account Number"
                placeholder="e.g. 1029384756"
                value={accountNumber}
                onChange={(val) => {
                  setAccountNumber(val);
                  setCustomerName(null);
                }}
                onVerify={handleVerifyAccount}
                verifiedCustomer={customerName}
              />
              
              {customerName && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Amount Due</p>
                  <p className="text-3xl font-bold">KES {amount}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <Button onClick={handleBack} variant="outline" size="lg">
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!customerName} 
                size="lg"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Phone */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Payment Details</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter the mobile money number to pay from.</p>
              
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
                disabled={!isPhoneValid || !isValidKenyanPhone(phone)} 
                size="lg"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 & 5: Checkout & Status */}
        {step >= 4 && (
          <UnifiedCheckout 
            order={orderPayload}
            onEditDetails={handleBack}
          />
        )}

      </div>
    </main>
  );
}
