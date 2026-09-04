"use client";

import React, { useState } from "react";
import { UtilityTypeSelector, UtilityType } from "@/components/services/UtilityTypeSelector";
import { AccountNumberInput } from "@/components/services/AccountNumberInput";
import { PhoneInput } from "@/components/services/PhoneInput";
import { AmountSelector } from "@/components/services/AmountSelector";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";

type Step = 1 | 2 | 3 | 4;

export default function ElectricityPage() {
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<UtilityType>("Prepaid");
  
  // Account Verification
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  
  // Payment Details
  const [amount, setAmount] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const handleVerifyAccount = async (acc: string) => {
    try {
      const res = await fetch("/api/services/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: acc,
          service: `kplc-${type.toLowerCase()}`
        })
      });

      if (!res.ok) {
        setCustomerName(null);
        return null;
      }

      const data = await res.json();
      if (data.valid && data.customerName) {
        setCustomerName(data.customerName);
        if (type === "Postpaid" && data.balance > 0) {
          setAmount(data.balance);
        }
        return { customerName: data.customerName, balance: data.balance };
      }
      
      setCustomerName(null);
      return null;
    } catch (e) {
      console.error("Account verification error:", e);
      setCustomerName(null);
      return null;
    }
  };

  const orderPayload: OrderPayload = {
    serviceId: `kplc-${type.toLowerCase()}`,
    serviceName: `KPLC ${type}`,
    provider: "Kenya Power",
    destination: accountNumber,
    amount: amount,
    fees: type === "Prepaid" ? 0 : 50,
    paymentPhone: phone,
    metadata: {
      accountName: customerName,
      utilityType: type
    }
  };

  const isStep2Valid = isPhoneValid && amount >= 50;

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="container max-w-3xl mx-auto px-4">
        
        {/* Header */}
        {step < 4 && (
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
                <Zap className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Pay KPLC Bills</h1>
            </div>
            <p className="text-muted-foreground">Buy tokens or pay your postpaid electricity bill securely.</p>
          </div>
        )}

        {/* Progress Bar */}
        {step < 4 && (
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-primary">Account</span>
              <span className={step >= 2 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Payment</span>
              <span className={step >= 3 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Confirm</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
              <div className="h-full bg-primary transition-all duration-300 w-1/3" />
              <div className={`h-full transition-all duration-300 w-1/3 ${step >= 2 ? "bg-primary" : "bg-transparent"}`} />
              <div className={`h-full transition-all duration-300 w-1/3 ${step >= 3 ? "bg-primary" : "bg-transparent"}`} />
            </div>
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Account Details</h2>
              
              <UtilityTypeSelector 
                value={type} 
                onChange={(val) => {
                  setType(val);
                  setAccountNumber("");
                  setCustomerName(null);
                  setAmount(0);
                }} 
                className="mb-8"
              />
              
              <AccountNumberInput
                label={type === "Prepaid" ? "Meter Number" : "Account Number"}
                placeholder={`Enter your ${type === "Prepaid" ? "meter" : "account"} number`}
                value={accountNumber}
                onChange={(val) => {
                  setAccountNumber(val);
                  setCustomerName(null);
                }}
                onVerify={handleVerifyAccount}
                verifiedCustomer={customerName}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!customerName} size="lg" className="w-full sm:w-auto">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Payment Details</h2>
              
              {type === "Prepaid" ? (
                <div className="mb-8">
                  <AmountSelector 
                    value={amount} 
                    onChange={setAmount} 
                    minAmount={50}
                    presets={[250, 500, 1000, 2000]}
                  />
                </div>
              ) : (
                <div className="mb-8">
                   <p className="text-sm text-muted-foreground mb-2">Amount Due</p>
                   <p className="text-3xl font-bold text-foreground">KES {amount}</p>
                </div>
              )}
              
              <div className="border-t border-border/50 pt-8">
                <PhoneInput 
                  value={phone} 
                  onChange={setPhone} 
                  onValidationChange={setIsPhoneValid} 
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <Button onClick={handleBack} variant="outline" size="lg">
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!isStep2Valid || !isValidKenyanPhone(phone)} 
                size="lg"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 & 4: Checkout & Status */}
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
