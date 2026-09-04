import React from "react";
import { DetailedServiceCard } from "@/components/services/DetailedServiceCard";
import { Metadata } from "next";
import { Smartphone, Wifi, Zap, Tv, Droplets, Sparkles, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Services Directory | QasiNet",
  description: "Browse our premium digital services including Airtime, Data Bundles, TV, and Utility payments.",
};

const mobileServices = [
  {
    id: "safaricom-airtime",
    title: "Safaricom Airtime",
    description: "Instantly top up Safaricom airtime for yourself or someone else. Direct M-Pesa fulfillment.",
    logoSrc: "/logos/safaricom-logo.png",
    href: "/services/airtime?provider=safaricom",
    ctaText: "Buy Safaricom Airtime",
    badge: "0% Fee",
  },
  {
    id: "airtel-airtime",
    title: "Airtel Airtime",
    description: "Recharge Airtel lines across Kenya with automated delivery.",
    logoSrc: "/logos/airtel-logo.jpg",
    href: "/services/airtime?provider=airtel",
    ctaText: "Buy Airtel Airtime",
    badge: "0% Fee",
  },
  {
    id: "telkom-airtime",
    title: "Telkom Airtime",
    description: "Buy Telkom airtime anytime, anywhere securely on QasiNet.",
    logoSrc: "/logos/telcom-logo.png",
    href: "/services/airtime?provider=telkom",
    ctaText: "Buy Telkom Airtime",
    badge: "0% Fee",
  },
  {
    id: "faiba-airtime",
    title: "Faiba 4G Airtime",
    description: "Get Faiba JTL airtime top-up in seconds.",
    logoSrc: "/logos/faiba-logo.png",
    href: "/services/airtime?provider=faiba",
    ctaText: "Buy Faiba Airtime",
    badge: "Instant",
  },
  {
    id: "equitel-airtime",
    title: "Equitel Airtime",
    description: "Purchase Equitel credit with zero delays and immediate confirmation.",
    logoSrc: "/logos/equitel-logo.jpg",
    href: "/services/airtime?provider=equitel",
    ctaText: "Buy Equitel Airtime",
    badge: "Instant",
  },
  {
    id: "data-bundles",
    title: "Data Bundles (All Networks)",
    description: "Daily, weekly, and monthly data bundles across Safaricom, Airtel, Faiba & Telkom.",
    logoSrc: "/logos/safaricom-logo.png",
    href: "/services/data",
    ctaText: "Browse Data Bundles",
    badge: "Best Rates",
  },
];

const tvServices = [
  {
    id: "dstv",
    title: "DStv Subscription",
    description: "Renew your DStv decoder packages with automated smartcard detection and instant reactivation.",
    logoSrc: "/logos/dstv-logo.jpg",
    href: "/services/tv?provider=dstv",
    ctaText: "Pay DStv",
    badge: "Instant Clear",
  },
  {
    id: "gotv",
    title: "GOtv Subscription",
    description: "Renew your GOtv subscription effortlessly and get back to your favorite matches and shows.",
    logoSrc: "/logos/gotv-logo.png",
    href: "/services/tv?provider=gotv",
    ctaText: "Pay GOtv",
    badge: "Instant Clear",
  },
  {
    id: "startimes",
    title: "StarTimes Decoder",
    description: "Keep your StarTimes decoder active. Instant smartcard payments available 24/7.",
    logoSrc: "/logos/startimes-logo.jpg",
    href: "/services/tv?provider=startimes",
    ctaText: "Pay StarTimes",
    badge: "24/7",
  },
  {
    id: "zuku",
    title: "Zuku Satellite TV",
    description: "Settle your Zuku TV or home internet bills fast and securely.",
    logoSrc: "/logos/zuku-logo.jpg",
    href: "/services/tv?provider=zuku",
    ctaText: "Pay Zuku",
    badge: "Direct",
  },
];

const utilityServices = [
  {
    id: "kplc-prepaid",
    title: "Kenya Power (KPLC Prepaid)",
    description: "Buy electricity tokens with automatic meter owner detection and instant 20-digit token generation.",
    logoSrc: "/logos/kenya-power-logo.jpg",
    href: "/services/electricity",
    ctaText: "Buy KPLC Tokens",
    badge: "Auto Detect",
  },
  {
    id: "kplc-postpaid",
    title: "Kenya Power (KPLC Postpaid)",
    description: "Pay postpaid electricity bills with live balance inquiry and instant clearance.",
    logoSrc: "/logos/kenya-power-logo.jpg",
    href: "/services/electricity",
    ctaText: "Pay Postpaid Bill",
    badge: "Live Balance",
  },
  {
    id: "nairobi-water",
    title: "Nairobi Water Utility",
    description: "Settle your municipal water bills promptly to ensure uninterrupted water supply.",
    logoSrc: "/logos/water-service-logo.jpg",
    href: "/services/water",
    ctaText: "Pay Water Bill",
    badge: "Zero Fee",
  },
];

export default function ServicesDirectoryPage() {
  return (
    <div className="flex flex-col min-h-screen pt-12 pb-20">
      
      {/* Header Banner */}
      <section className="py-12 sm:py-16 text-center max-w-3xl mx-auto px-4 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> All-In-One Utilities Portal
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Digital Services Directory
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Explore our complete catalogue of certified telecom, power, and entertainment payment gateways. Automated delivery guaranteed.
        </p>
      </section>

      {/* Categories */}
      <div className="container mx-auto px-4 md:px-6 space-y-20 max-w-7xl">
        
        {/* Mobile Services */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">Mobile Airtime & Data</h2>
              <p className="text-xs text-muted-foreground">All Kenyan cellular networks supported</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {mobileServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

        {/* TV Subscriptions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">TV & Media Subscriptions</h2>
              <p className="text-xs text-muted-foreground">Instant smartcard activation and clear signals</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {tvServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

        {/* Utilities & Electricity */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">Power & Water Utilities</h2>
              <p className="text-xs text-muted-foreground">24/7 instant token delivery and bill settlement</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {utilityServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
