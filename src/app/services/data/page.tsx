"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { NetworkSelector, Network } from "@/components/services/NetworkSelector";
import { PhoneInput } from "@/components/services/PhoneInput";
import { BundleSelector, DataBundle } from "@/components/services/BundleSelector";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Wifi, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";
import { detectCarrier } from "@/lib/carrier";
import { useAuth } from "@/lib/auth";
import { getRememberedServiceDestination } from "@/lib/beneficiaries";

type Step = 1 | 2 | 3 | 4 | 5;

export default function DataPage() {
  const [step, setStep] = useState<Step>(1);
  const [network, setNetwork] = useState<Network | null>(null);
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [bundle, setBundle] = useState<DataBundle | null>(null);
  const [networkBundles, setNetworkBundles] = useState<Record<string, DataBundle[]>>({});
  const [isLoadingBundles, setIsLoadingBundles] = useState(true);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Load URL phone param, remembered phone, or user phone
  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    if (urlPhone && isValidKenyanPhone(urlPhone)) {
      setPhone(urlPhone);
      setIsPhoneValid(true);
      return;
    }

    const remembered = getRememberedServiceDestination("data") || getRememberedServiceDestination("airtime");
    if (remembered && isValidKenyanPhone(remembered.destination)) {
      setPhone(remembered.destination);
      setIsPhoneValid(true);
      return;
    }

    if (user?.phone && isValidKenyanPhone(user.phone)) {
      setPhone(user.phone);
      setIsPhoneValid(true);
    }
  }, [searchParams, user]);

  // Fetch live bundles from database
  useEffect(() => {
    async function loadBundles() {
      try {
        setIsLoadingBundles(true);
        const res = await fetch('/api/services/data', { cache: 'no-store' });
        const data = await res.json();
        if (data && data.networks) {
          setNetworkBundles(data.networks);
        }
      } catch (err) {
        console.error('Failed to load live data bundles:', err);
      } finally {
        setIsLoadingBundles(false);
      }
    }
    loadBundles();
  }, []);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const detectedCarrier = detectCarrier(phone);
  const effectiveNetwork: Network = (
    detectedCarrier.name === "AIRTEL" ? "Airtel" :
    detectedCarrier.name === "TELKOM" ? "Telkom" :
    detectedCarrier.name === "EQUITEL" ? "Equitel" :
    detectedCarrier.name === "FAIBA" ? "Faiba" :
    detectedCarrier.name === "SAFARICOM" ? "Safaricom" :
    (network || "Safaricom")
  );

  const isStep1Valid = network !== null || detectedCarrier.name !== "UNKNOWN";
  const isStep2Valid = isPhoneValid;
  const isStep3Valid = bundle !== null;

  const currentBundles = networkBundles[effectiveNetwork] || [];

  const orderPayload: OrderPayload = {
    serviceId: `${effectiveNetwork.toLowerCase()}-data`,
    serviceName: `${effectiveNetwork} Data Bundle`,
    provider: effectiveNetwork,
    productId: bundle?.id,
    destination: phone,
    amount: bundle?.price || 0,
    fees: 0,
    paymentPhone: phone,
    metadata: {
      package: bundle ? `${bundle.name} (${bundle.allowance})` : "",
      validity: bundle?.validity,
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
                <Wifi className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Buy Data Bundles</h1>
            </div>
            <p className="text-muted-foreground">Stay connected with affordable internet packages for all Kenyan networks.</p>
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
              <h2 className="text-xl font-semibold mb-2">Select Network</h2>
              <p className="text-xs text-muted-foreground mb-6">Choose your provider or enter your number in the next step for automatic carrier detection.</p>
              <NetworkSelector 
                selectedNetwork={network || (detectedCarrier.name !== "UNKNOWN" ? effectiveNetwork : null)} 
                onSelect={(net) => {
                  setNetwork(net);
                  setBundle(null);
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
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Recipient Details</h2>
                <p className="text-sm text-muted-foreground">Enter the phone number to receive the data bundle.</p>
              </div>
              
              <PhoneInput 
                value={phone} 
                onChange={setPhone} 
                onValidationChange={setIsPhoneValid}
                onCarrierChange={(c) => {
                  if (c.name === "AIRTEL") setNetwork("Airtel");
                  else if (c.name === "TELKOM") setNetwork("Telkom");
                  else if (c.name === "EQUITEL") setNetwork("Equitel");
                  else if (c.name === "FAIBA") setNetwork("Faiba");
                  else if (c.name === "SAFARICOM") setNetwork("Safaricom");
                }}
              />

              {/* Active Network Preview Badge Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 p-1 flex items-center justify-center border border-border/40">
                    <Image 
                      src={detectedCarrier.name !== "UNKNOWN" ? detectedCarrier.logoSrc : (network === "Airtel" ? "/logos/airtel-logo.jpg" : network === "Telkom" ? "/logos/telcom-logo.png" : "/logos/safaricom-logo.png")} 
                      alt={effectiveNetwork} 
                      fill 
                      sizes="32px"
                      className="object-contain p-0.5" 
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Destination Carrier</span>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {effectiveNetwork} Kenya
                      {detectedCarrier.name !== "UNKNOWN" && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Auto-Detected
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Change
                </button>
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

        {/* Step 3: Bundle */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Recipient summary banner */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white shrink-0">
                  <Image 
                    src={detectedCarrier.name !== "UNKNOWN" ? detectedCarrier.logoSrc : (effectiveNetwork === "Airtel" ? "/logos/airtel-logo.jpg" : "/logos/safaricom-logo.png")} 
                    alt={effectiveNetwork} 
                    fill 
                    sizes="24px"
                    className="object-contain p-0.5" 
                  />
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Recipient: </span>
                  <strong className="text-foreground font-mono">{phone}</strong>
                  <span className={cn("ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold border", detectedCarrier.badgeBg, detectedCarrier.borderBg)}>
                    {effectiveNetwork}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Select {effectiveNetwork} Package</h2>
                {isLoadingBundles && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading live packages...
                  </span>
                )}
              </div>

              {isLoadingBundles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-36 rounded-2xl bg-secondary/40 animate-pulse border border-border/40" />
                  ))}
                </div>
              ) : currentBundles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <p className="font-semibold">No packages currently available for {effectiveNetwork}.</p>
                  <p className="text-xs">Please select another provider or check back shortly.</p>
                </div>
              ) : (
                <BundleSelector 
                  bundles={currentBundles}
                  selectedBundleId={bundle?.id || null}
                  onSelect={setBundle}
                />
              )}
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

