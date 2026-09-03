"use client";

import React, { useState } from "react";
import { ProviderSelector, ProviderOption } from "@/components/services/ProviderSelector";
import { AccountNumberInput } from "@/components/services/AccountNumberInput";
import { PhoneInput } from "@/components/services/PhoneInput";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Droplets } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";

type Step = 1 | 2 | 3 | 4 | 5;

// Extensible other bills architecture based on config
// If a provider's 'enabled' flag is false, it won't appear.
const WATER_PROVIDERS: (ProviderOption & { enabled: boolean })[] = [
  { id: "nairobi-water", name: "Nairobi Water", logoSrc: "/logos/water-service-logo.jpg", enabled: true },
  // { id: "mombasa-water", name: "Mombasa Water", logoSrc: "/logos/water-generic.png", enabled: false }, // Example of disabled
];

const ACTIVE_PROVIDERS = WATER_PROVIDERS.filter(p => p.enabled);

export default function WaterPage() {
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
    // Mock API call
    return new Promise<{ customerName: string } | null>((resolve) => {
      setTimeout(() => {
        if (acc === "0000") {
          resolve(null);
        } else {
          setAmount(850);
          setCustomerName("Nairobi Resident");
          resolve({ customerName: "Nairobi Resident" });
        }
      }, 1500);
    });
  };

  const selectedProviderData = ACTIVE_PROVIDERS.find(p => p.id === provider);

  const orderPayload: OrderPayload = {
    serviceId: provider || "water",
    serviceName: `${selectedProviderData?.name || "Water"} Bill`,
    provider: selectedProviderData?.name || provider || "",
    destination: accountNumber,
    amount: amount,
    fees: 20, // Mock convenience fee
    paymentPhone: phone,
    metadata: {
      accountName: customerName,
    }
  };

  if (ACTIVE_PROVIDERS.length === 0) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-3xl mx-auto px-4 text-center space-y-4">
           <Droplets className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
           <h2 className="text-2xl font-bold">Service Unavailable</h2>
           <p className="text-muted-foreground">Water bill payments are currently undergoing maintenance or are not available in your region yet.</p>
           <Button asChild className="mt-4">
             <Link href="/services">Return to Services</Link>
           </Button>
        </div>
      </main>
    );
  }

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
                <Droplets className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Pay Water Bill</h1>
            </div>
            <p className="text-muted-foreground">Settle your water utility bills fast and securely.</p>
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
              <h2 className="text-xl font-semibold mb-6">Select Water Company</h2>
              <ProviderSelector 
                providers={ACTIVE_PROVIDERS}
                selectedProviderId={provider} 
                onSelect={(id) => {
                  setProvider(id);
                  setCustomerName(null);
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
              <p className="text-sm text-muted-foreground mb-6">Enter your {selectedProviderData?.name} account number.</p>
              
              <AccountNumberInput
                label="Account Number"
                placeholder="e.g. 123456789"
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
