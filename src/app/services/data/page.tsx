"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { PhoneInput } from "@/components/services/PhoneInput";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Wifi, RefreshCw, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";
import { detectCarrier } from "@/lib/carrier";
import { useAuth } from "@/lib/auth";
import { getRememberedServiceDestination } from "@/lib/beneficiaries";
import { FAIBA_DATA_BUNDLES, FaibaBundle, IS_FAIBA_BUNDLES_ENABLED } from "@/lib/constants/faiba-bundles";

type Step = 1 | 2 | 3 | 4 | 5;

interface ProviderNetwork {
  id: string;
  name: string;
  logoSrc: string;
  supported: boolean;
  note?: string;
}

const NETWORKS: ProviderNetwork[] = [
  { id: "faiba", name: "Faiba 4G", logoSrc: "/logos/faiba-logo.png", supported: true, note: "19 Bundles Available" },
  { id: "safaricom", name: "Safaricom", logoSrc: "/logos/safaricom-logo.png", supported: false, note: "Coming Soon" },
  { id: "airtel", name: "Airtel", logoSrc: "/logos/airtel-logo.jpg", supported: false, note: "Coming Soon" },
  { id: "telkom", name: "Telkom", logoSrc: "/logos/telcom-logo.png", supported: false, note: "Coming Soon" },
  { id: "equitel", name: "Equitel", logoSrc: "/logos/equitel-logo.jpg", supported: false, note: "Coming Soon" },
];

function DataContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("faiba");
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<FaibaBundle | null>(null);
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

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const detectedCarrier = detectCarrier(phone);
  const isCarrierNonFaiba = detectedCarrier.name !== "UNKNOWN" && detectedCarrier.name !== "FAIBA";

  const isStep1Valid = selectedNetwork === "faiba";
  const isStep2Valid = isPhoneValid;
  const isStep3Valid = IS_FAIBA_BUNDLES_ENABLED && selectedBundle !== null && selectedBundle.price > 2 && selectedBundle.price < 7000 && Number.isInteger(selectedBundle.price);

  const orderPayload: OrderPayload = {
    serviceId: "faiba-data",
    serviceName: `Faiba ${selectedBundle?.name || "Data Bundle"}`,
    provider: "Faiba",
    productId: selectedBundle?.code,
    destination: phone,
    amount: selectedBundle?.price || 0,
    fees: 0,
    paymentPhone: phone,
    metadata: {
      package: selectedBundle ? `${selectedBundle.name} (${selectedBundle.allowance})` : "",
      validity: selectedBundle?.validity,
      productCode: selectedBundle?.code
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
              <h1 className="text-3xl font-bold">Buy Faiba 4G Data Bundles</h1>
            </div>
            <p className="text-muted-foreground">
              Official high-speed data packages for Faiba 4G lines. (Safaricom, Airtel & Telkom bundles coming soon).
            </p>
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

        {/* Step 1: Network Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Select Network</h2>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Faiba Exclusive
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Data bundle vending is currently supported exclusively for Faiba 4G. Non-Faiba networks are coming soon.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {NETWORKS.map((net) => {
                  const isSelected = selectedNetwork === net.id;
                  return (
                    <button
                      key={net.id}
                      type="button"
                      disabled={!net.supported}
                      onClick={() => {
                        if (net.supported) {
                          setSelectedNetwork(net.id);
                          setTimeout(handleNext, 250);
                        }
                      }}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 text-center",
                        net.supported
                          ? isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary cursor-pointer hover:shadow-md"
                            : "border-border/60 bg-card hover:border-primary/50 cursor-pointer"
                          : "border-border/30 bg-secondary/30 opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="w-12 h-12 mb-3 relative flex items-center justify-center bg-white rounded-lg p-1">
                        <Image 
                          src={net.logoSrc} 
                          alt={net.name} 
                          fill 
                          sizes="48px"
                          className="object-contain p-1" 
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-primary font-bold" : "text-foreground"
                      )}>
                        {net.name}
                      </span>
                      <span className={cn(
                        "text-[10px] mt-1 font-semibold px-1.5 py-0.5 rounded",
                        net.supported
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                          : "text-muted-foreground bg-muted/60"
                      )}>
                        {net.note}
                      </span>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Informative helper note for non-Faiba networks */}
              <div className="mt-6 p-4 rounded-2xl bg-secondary/40 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground">Looking to top-up Safaricom, Airtel, Telkom, or Equitel?</span>
                  <p className="text-[11px] mt-0.5">Airtime top-up is 100% active and available across all 5 Kenyan networks.</p>
                </div>
                <Link 
                  href="/services/airtime"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 text-xs font-bold gap-1")}
                >
                  Buy Airtime <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!isStep1Valid} size="lg" className="w-full sm:w-auto">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Recipient Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Recipient Details</h2>
                <p className="text-sm text-muted-foreground">Enter the Faiba 4G phone number (0747...) to receive the data bundle.</p>
              </div>
              
              <PhoneInput 
                value={phone} 
                onChange={setPhone} 
                onValidationChange={setIsPhoneValid}
              />

              {/* Carrier mismatch warning if user typed a Safaricom/Airtel/Telkom number */}
              {isCarrierNonFaiba && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Non-Faiba Number Detected ({detectedCarrier.name})</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Data bundles on Qasinet are currently exclusive to Faiba 4G lines (0747...). Direct data bundles for {detectedCarrier.name} are not supported by the gateway yet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/services/airtime?phone=${phone}`)}
                    className="text-xs font-bold text-primary border-primary/40 hover:bg-primary/10"
                  >
                    Switch to {detectedCarrier.name} Airtime Top-Up Instead →
                  </Button>
                </div>
              )}

              {/* Active Network Preview Badge Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 p-1 flex items-center justify-center border border-border/40">
                    <Image 
                      src="/logos/faiba-logo.png" 
                      alt="Faiba 4G" 
                      fill 
                      sizes="32px"
                      className="object-contain p-0.5" 
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Destination Network</span>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Faiba 4G Kenya
                      {detectedCarrier.name === "FAIBA" && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Faiba Number Verified
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

        {/* Step 3: Bundle Selection */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Recipient summary banner */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white shrink-0">
                  <Image 
                    src="/logos/faiba-logo.png" 
                    alt="Faiba 4G" 
                    fill 
                    sizes="24px"
                    className="object-contain p-0.5" 
                  />
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Recipient: </span>
                  <strong className="text-foreground font-mono">{phone}</strong>
                  <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold border text-cyan-400 bg-cyan-500/10 border-cyan-500/20">
                    Faiba 4G
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Select Faiba 4G Package</h2>
                <span className="text-xs text-muted-foreground font-medium">{FAIBA_DATA_BUNDLES.length} Packages Available</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Choose an official published Faiba data bundle or combo package.
              </p>

              {/* Provider Authorization State Banner */}
              {!IS_FAIBA_BUNDLES_ENABLED && (
                <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Faiba Bundle Checkout Temporarily Paused (Provider Activation)</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Faiba data bundle vending is undergoing provider-level authorization with Kyanda.
                    Pinless Faiba Airtime is 100% active and can be purchased right now.
                  </p>
                  <Link 
                    href={`/services/airtime?phone=${phone}&provider=faiba`} 
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline pt-1"
                  >
                    Buy Faiba Airtime Top-Up Instead →
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FAIBA_DATA_BUNDLES.map((bundleItem) => {
                  const isSelected = selectedBundle?.code === bundleItem.code;
                  return (
                    <button
                      key={bundleItem.code}
                      type="button"
                      onClick={() => setSelectedBundle(bundleItem)}
                      className={cn(
                        "flex flex-col p-4 rounded-2xl border text-left transition-all",
                        "hover:border-primary/50 hover:shadow-sm",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                          : "border-border/50 bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {bundleItem.validity}
                        </span>
                        <span className="text-base font-bold text-foreground">
                          KES {bundleItem.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-foreground mb-0.5">{bundleItem.allowance}</p>
                      <p className="text-xs text-muted-foreground truncate">{bundleItem.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
              <Button onClick={handleBack} variant="outline" size="lg">
                Back
              </Button>
              <Button onClick={handleNext} disabled={!isStep3Valid} size="lg">
                {!IS_FAIBA_BUNDLES_ENABLED 
                  ? "Checkout Paused (Awaiting Provider)" 
                  : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
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

export default function DataPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading Data Bundles...</p>
        </div>
      </main>
    }>
      <DataContent />
    </Suspense>
  );
}
