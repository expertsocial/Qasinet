"use client";

import React, { useState } from "react";
import { NetworkSelector, Network } from "@/components/services/NetworkSelector";
import { PhoneInput } from "@/components/services/PhoneInput";
import { BundleSelector, DataBundle } from "@/components/services/BundleSelector";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Wifi } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";

type Step = 1 | 2 | 3 | 4 | 5;

// Mock bundles for demo purposes
const MOCK_BUNDLES: Record<string, DataBundle[]> = {
  Safaricom: [
    { id: "saf-d-1", name: "Daily 50MB", allowance: "50 MB", validity: "24 Hours", price: 20, category: "Daily" },
    { id: "saf-d-2", name: "Daily 200MB", allowance: "200 MB", validity: "24 Hours", price: 50, category: "Daily" },
    { id: "saf-d-3", name: "Daily 1GB", allowance: "1 GB", validity: "24 Hours", price: 99, category: "Daily" },
    { id: "saf-w-1", name: "Weekly 350MB", allowance: "350 MB", validity: "7 Days", price: 99, category: "Weekly" },
    { id: "saf-w-2", name: "Weekly 1GB", allowance: "1 GB", validity: "7 Days", price: 250, category: "Weekly" },
    { id: "saf-w-3", name: "Weekly 3GB", allowance: "3 GB", validity: "7 Days", price: 500, category: "Weekly" },
    { id: "saf-m-1", name: "Monthly 1.2GB", allowance: "1.2 GB", validity: "30 Days", price: 500, category: "Monthly" },
    { id: "saf-m-2", name: "Monthly 3GB", allowance: "3 GB", validity: "30 Days", price: 1000, category: "Monthly" },
    { id: "saf-m-3", name: "Monthly 10GB", allowance: "10 GB", validity: "30 Days", price: 2000, category: "Monthly" },
    { id: "saf-s-1", name: "Giga Bundle", allowance: "15 GB", validity: "30 Days", price: 2500, category: "Special" },
  ],
  Airtel: [
    { id: "air-d-1", name: "Bamba Daily", allowance: "100 MB", validity: "24 Hours", price: 20, category: "Daily" },
    { id: "air-w-1", name: "Bamba Weekly", allowance: "500 MB", validity: "7 Days", price: 100, category: "Weekly" },
    { id: "air-m-1", name: "Bamba Monthly", allowance: "2 GB", validity: "30 Days", price: 500, category: "Monthly" },
  ],
  Telkom: [
    { id: "tel-d-1", name: "T-Kash Daily", allowance: "150 MB", validity: "24 Hours", price: 20, category: "Daily" },
    { id: "tel-w-1", name: "T-Kash Weekly", allowance: "1 GB", validity: "7 Days", price: 100, category: "Weekly" },
  ],
  Equitel: [
    { id: "equ-d-1", name: "MyData Daily", allowance: "80 MB", validity: "24 Hours", price: 20, category: "Daily" },
    { id: "equ-m-1", name: "MyData Monthly", allowance: "1.5 GB", validity: "30 Days", price: 500, category: "Monthly" },
  ],
  Faiba: [
    { id: "fai-d-1", name: "Faiba Daily", allowance: "1 GB", validity: "24 Hours", price: 50, category: "Daily" },
    { id: "fai-w-1", name: "Faiba Weekly", allowance: "8 GB", validity: "7 Days", price: 300, category: "Weekly" },
    { id: "fai-m-1", name: "Faiba Monthly", allowance: "25 GB", validity: "30 Days", price: 1000, category: "Monthly" },
  ]
};

export default function DataPage() {
  const [step, setStep] = useState<Step>(1);
  const [network, setNetwork] = useState<Network | null>(null);
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [bundle, setBundle] = useState<DataBundle | null>(null);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const isStep1Valid = network !== null;
  const isStep2Valid = isPhoneValid;
  const isStep3Valid = bundle !== null;

  const orderPayload: OrderPayload = {
    serviceId: network ? `${network.toLowerCase()}-airtime` : "data",
    serviceName: "Data Bundle",
    provider: network || "",
    destination: phone,
    amount: bundle?.price || 0,
    fees: 0,
    paymentPhone: phone,
    metadata: {
      package: bundle ? `${bundle.name} (${bundle.allowance})` : "",
      validity: bundle?.validity,
    }
  };

  const bundlesForNetwork = network ? MOCK_BUNDLES[network] || [] : [];

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
                <Wifi className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Buy Data Bundles</h1>
            </div>
            <p className="text-muted-foreground">Stay connected with affordable internet packages.</p>
          </div>
        )}

        {/* Progress Bar */}
        {step < 5 && (
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-primary">Network</span>
              <span className={step >= 2 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Details</span>
              <span className={step >= 3 ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-muted-foreground"}>Bundle</span>
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

        {/* Step 1: Network */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Select Network</h2>
              <NetworkSelector 
                selectedNetwork={network} 
                onSelect={(net) => {
                  setNetwork(net);
                  setBundle(null); // Reset bundle if network changes
                  setTimeout(handleNext, 300);
                }} 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!isStep1Valid} size="lg" className="w-full sm:w-auto">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Recipient Details</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter the phone number to receive the bundle.</p>
              
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
                disabled={!isStep2Valid || !isValidKenyanPhone(phone)} 
                size="lg"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Bundle */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Select Package</h2>
              <BundleSelector 
                bundles={bundlesForNetwork}
                selectedBundleId={bundle?.id || null}
                onSelect={setBundle}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <Button onClick={handleBack} variant="outline" size="lg">
                Back
              </Button>
              <Button onClick={handleNext} disabled={!isStep3Valid} size="lg">
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
