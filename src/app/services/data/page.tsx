"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/services/PhoneInput";
import { UnifiedCheckout } from "@/components/checkout/UnifiedCheckout";
import { OrderPayload } from "@/lib/payment";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Wifi, RefreshCw, AlertTriangle, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidKenyanPhone } from "@/lib/validation";
import { detectCarrier } from "@/lib/carrier";
import { useAuth } from "@/lib/auth";
import { getRememberedServiceDestination } from "@/lib/beneficiaries";
import { FAIBA_DATA_BUNDLES, IS_FAIBA_BUNDLES_ENABLED } from "@/lib/constants/faiba-bundles";
import { SAFARICOM_DATA_BUNDLES } from "@/lib/constants/safaricom-bundles";
import { AIRTEL_DATA_BUNDLES } from "@/lib/constants/airtel-bundles";

type Step = 1 | 2 | 3 | 4 | 5;
type SupportedNetwork = "safaricom" | "airtel" | "faiba";

interface ProviderNetwork {
  id: "safaricom" | "airtel" | "faiba" | "telkom" | "equitel";
  name: string;
  logoSrc: string;
  supported: boolean;
  note?: string;
  serviceId: string;
  badge?: string;
}

const NETWORKS: ProviderNetwork[] = [
  { id: "safaricom", name: "Safaricom", logoSrc: "/logos/safaricom-logo.png", supported: true, note: "🔥 Super Bundles", serviceId: "safaricom-data", badge: "Okoa Friendly" },
  { id: "airtel", name: "Airtel", logoSrc: "/logos/airtel-logo.jpg", supported: true, note: "⚡ High-Speed", serviceId: "airtel-data", badge: "Best Rates" },
  { id: "faiba", name: "Faiba 4G", logoSrc: "/logos/faiba-logo.png", supported: true, note: "📶 Unlimited & Data", serviceId: "faiba-data", badge: "High Speed" },
  { id: "telkom", name: "Telkom", logoSrc: "/logos/telcom-logo.png", supported: false, note: "Coming Soon", serviceId: "telkom-data" },
  { id: "equitel", name: "Equitel", logoSrc: "/logos/equitel-logo.jpg", supported: false, note: "Coming Soon", serviceId: "equitel-data" },
];

export interface UnifiedBundleItem {
  id?: string;
  code: string;
  name: string;
  price: number;
  validity: string;
  allowance: string;
  badge?: string;
  popular?: boolean;
  category?: string;
  description?: string;
}

function DataContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);

  const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>(() => {
    const netParam = searchParams.get("network") || searchParams.get("provider");
    if (netParam) {
      const lower = netParam.toLowerCase();
      if (lower.includes("safaricom")) return "safaricom";
      if (lower.includes("airtel")) return "airtel";
      if (lower.includes("faiba")) return "faiba";
    }
    return "safaricom";
  });

  const [phone, setPhone] = useState<string>(() => {
    const urlPhone = searchParams.get("phone");
    if (urlPhone && isValidKenyanPhone(urlPhone)) return urlPhone;
    return "";
  });

  const [isPhoneValid, setIsPhoneValid] = useState<boolean>(() => {
    const urlPhone = searchParams.get("phone");
    return Boolean(urlPhone && isValidKenyanPhone(urlPhone));
  });

  const [selectedBundle, setSelectedBundle] = useState<UnifiedBundleItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Load remembered destination or user phone if none provided via URL
  useEffect(() => {
    if (phone) return;
    const timer = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(timer);
  }, [phone, user]);

  const currentNetworkConfig = NETWORKS.find((n) => n.id === selectedNetwork) || NETWORKS[0];

  // Resolve bundle list for currently selected network
  const availableBundles = useMemo<UnifiedBundleItem[]>(() => {
    if (selectedNetwork === "safaricom") {
      return SAFARICOM_DATA_BUNDLES.map((b) => ({
        id: b.code,
        name: b.name,
        code: b.code,
        price: b.price,
        validity: b.validity,
        allowance: b.allowance,
        badge: b.badge,
        popular: b.popular,
        category: b.category,
        description: b.description,
      }));
    } else if (selectedNetwork === "airtel") {
      return AIRTEL_DATA_BUNDLES.map((b) => ({
        id: b.code,
        name: b.name,
        code: b.code,
        price: b.price,
        validity: b.validity,
        allowance: b.allowance,
        badge: b.badge,
        popular: b.popular,
        category: b.category,
        description: b.description,
      }));
    } else {
      return FAIBA_DATA_BUNDLES.map((b) => ({
        id: b.code,
        name: b.name,
        code: b.code,
        price: b.price,
        validity: b.validity,
        allowance: b.allowance,
        category: "daily",
      }));
    }
  }, [selectedNetwork]);

  // Filtered bundles by category tab
  const filteredBundles = useMemo(() => {
    if (activeCategory === "all") return availableBundles;
    if (activeCategory === "popular") return availableBundles.filter((b) => b.popular);
    return availableBundles.filter((b) => b.category === activeCategory);
  }, [availableBundles, activeCategory]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const detectedCarrier = detectCarrier(phone);

  const isStep1Valid = selectedNetwork === "safaricom" || selectedNetwork === "airtel" || selectedNetwork === "faiba";
  const isStep2Valid = isPhoneValid;
  const isStep3Valid = selectedBundle !== null && selectedBundle.price > 2 && selectedBundle.price < 7000 && Number.isInteger(selectedBundle.price);

  const orderPayload: OrderPayload = {
    serviceId: currentNetworkConfig.serviceId,
    serviceName: `${currentNetworkConfig.name} ${selectedBundle?.name || "Data Bundle"}`,
    provider: currentNetworkConfig.name,
    productId: selectedBundle?.code,
    destination: phone,
    amount: selectedBundle?.price || 0,
    fees: 0,
    paymentPhone: phone,
    metadata: {
      package: selectedBundle ? `${selectedBundle.name} (${selectedBundle.allowance})` : "",
      validity: selectedBundle?.validity,
      productCode: selectedBundle?.code,
    },
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
              <h1 className="text-3xl font-bold">Buy Internet Data Bundles</h1>
            </div>
            <p className="text-muted-foreground">
              Instant high-speed Safaricom, Airtel & Faiba 4G bundles with automatic M-Pesa delivery.
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
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 3 Networks Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Choose the mobile network for your recipient. Special discounted bundles are active for Safaricom and Airtel lines.
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
                        if (net.id === "safaricom" || net.id === "airtel" || net.id === "faiba") {
                          setSelectedNetwork(net.id);
                          setSelectedBundle(null);
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

              {/* Informative helper note */}
              <div className="mt-6 p-4 rounded-2xl bg-secondary/40 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground">Need Airtime Top-Up Instead?</span>
                  <p className="text-[11px] mt-0.5">Airtime top-up is 100% active across all 5 Kenyan mobile networks with zero fees.</p>
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
                <p className="text-sm text-muted-foreground">
                  Enter the {currentNetworkConfig.name} mobile number to receive the bundle.
                </p>
              </div>
              
              <PhoneInput 
                value={phone} 
                onChange={setPhone} 
                onValidationChange={setIsPhoneValid}
              />

              {/* Special Safaricom Okoa Jahazi Friendly Reassurance */}
              {selectedNetwork === "safaricom" && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span><strong>Okoa Jahazi Friendly:</strong> Bundles activate immediately on Safaricom even if the recipient owes an active Okoa loan.</span>
                </div>
              )}

              {/* Carrier mismatch alert */}
              {detectedCarrier.name !== "UNKNOWN" && (
                <>
                  {selectedNetwork === "safaricom" && detectedCarrier.name !== "SAFARICOM" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Detected as {detectedCarrier.name} line. Switch network?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (detectedCarrier.name === "AIRTEL") setSelectedNetwork("airtel");
                          else if (detectedCarrier.name === "FAIBA") setSelectedNetwork("faiba");
                        }}
                        className="text-xs font-bold text-amber-400 underline shrink-0"
                      >
                        Switch Network
                      </button>
                    </div>
                  )}

                  {selectedNetwork === "airtel" && detectedCarrier.name !== "AIRTEL" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Detected as {detectedCarrier.name} line. Switch network?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (detectedCarrier.name === "SAFARICOM") setSelectedNetwork("safaricom");
                          else if (detectedCarrier.name === "FAIBA") setSelectedNetwork("faiba");
                        }}
                        className="text-xs font-bold text-amber-400 underline shrink-0"
                      >
                        Switch Network
                      </button>
                    </div>
                  )}

                  {selectedNetwork === "faiba" && detectedCarrier.name !== "FAIBA" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Entered phone is a {detectedCarrier.name} number (Faiba lines usually start with 0747).</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (detectedCarrier.name === "SAFARICOM") setSelectedNetwork("safaricom");
                          else if (detectedCarrier.name === "AIRTEL") setSelectedNetwork("airtel");
                        }}
                        className="text-xs font-bold text-amber-400 underline shrink-0"
                      >
                        Switch Network
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Selected Network Summary Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 p-1 flex items-center justify-center border border-border/40">
                    <Image 
                      src={currentNetworkConfig.logoSrc} 
                      alt={currentNetworkConfig.name} 
                      fill 
                      sizes="32px"
                      className="object-contain p-0.5" 
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Destination Network</span>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {currentNetworkConfig.name} Kenya
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
                    src={currentNetworkConfig.logoSrc} 
                    alt={currentNetworkConfig.name} 
                    fill 
                    sizes="24px"
                    className="object-contain p-0.5" 
                  />
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Recipient: </span>
                  <strong className="text-foreground font-mono">{phone}</strong>
                  <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold border text-primary bg-primary/10 border-primary/20">
                    {currentNetworkConfig.name}
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
                <h2 className="text-xl font-semibold">Select {currentNetworkConfig.name} Package</h2>
                <span className="text-xs text-muted-foreground font-medium">{availableBundles.length} Bundles Available</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Choose from our popular discounted data bundles and combos with instant network delivery.
              </p>

              {/* Category Filter Pills (for Safaricom & Airtel) */}
              {selectedNetwork !== "faiba" && (
                <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-border/40">
                  {[
                    { id: "all", label: "All Bundles" },
                    { id: "popular", label: "🔥 Hot Deals" },
                    { id: "daily", label: "⏱️ Daily / Midnight" },
                    { id: "weekly", label: "📦 Weekly" },
                    ...(selectedNetwork === "safaricom" ? [{ id: "voice_combo", label: "📞 Minutes & Combos" }] : []),
                    { id: "monthly", label: "🚀 Monthly" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        activeCategory === tab.id
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Faiba specific pause note if applicable */}
              {selectedNetwork === "faiba" && !IS_FAIBA_BUNDLES_ENABLED && (
                <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Faiba Bundle Checkout Temporarily Paused (Provider Maintenance)</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Faiba data bundles are undergoing maintenance. Safaricom and Airtel bundles are 100% active and available above.
                  </p>
                </div>
              )}

              {/* Bundles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBundles.map((bundleItem) => {
                  const isSelected = selectedBundle?.code === bundleItem.code;
                  return (
                    <button
                      key={bundleItem.code}
                      type="button"
                      onClick={() => setSelectedBundle(bundleItem)}
                      className={cn(
                        "flex flex-col p-4 rounded-2xl border text-left transition-all relative overflow-hidden",
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
                      
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-lg font-bold text-foreground">{bundleItem.allowance}</p>
                        {bundleItem.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {bundleItem.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">{bundleItem.name}</p>

                      {bundleItem.description && (
                        <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">{bundleItem.description}</p>
                      )}
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
                Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
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
