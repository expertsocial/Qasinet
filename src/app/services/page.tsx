import React from "react";
import { DetailedServiceCard } from "@/components/services/DetailedServiceCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | QasiNet",
  description: "Browse our premium digital services including Airtime, Data, TV, and Utility payments.",
};

const mobileServices = [
  {
    id: "safaricom-airtime",
    title: "Safaricom Airtime",
    description: "Instantly top up Safaricom airtime for yourself or someone else. Secure and reliable.",
    logoSrc: "/logos/safaricom logo.png",
    href: "/services/airtime",
    ctaText: "Buy Airtime",
  },
  {
    id: "airtel-airtime",
    title: "Airtel Airtime",
    description: "Recharge Airtel lines across Kenya in seconds.",
    logoSrc: "/logos/airtel logo.jpg",
    href: "/services/airtime",
    ctaText: "Buy Airtime",
  },
  {
    id: "telkom-airtime",
    title: "Telkom Airtime",
    description: "Buy Telkom airtime anytime, anywhere securely on QasiNet.",
    logoSrc: "/logos/telcom logo.png",
    href: "/services/airtime",
    ctaText: "Buy Airtime",
  },
  {
    id: "equitel-airtime",
    title: "Equitel Airtime",
    description: "Purchase Equitel airtime with zero delays.",
    logoSrc: "/logos/Equitel logo.jpg",
    href: "/services/airtime",
    ctaText: "Buy Airtime",
  },
  {
    id: "faiba-airtime",
    title: "Faiba Airtime",
    description: "Get Faiba airtime for your JTL line instantly.",
    logoSrc: "/logos/Faiba logo.png",
    href: "/services/airtime",
    ctaText: "Buy Airtime",
  },
  {
    id: "data-bundles",
    title: "Data Bundles",
    description: "Top up data bundles directly for any network in Kenya.",
    logoSrc: "/logos/safaricom logo.png", // Use a generic or safaricom one to represent data, or keep it generic
    href: "/services/data",
    ctaText: "Buy Data",
  },
];

const tvServices = [
  {
    id: "dstv",
    title: "DStv",
    description: "Pay your DStv subscription through QasiNet. Vended immediately upon payment.",
    logoSrc: "/logos/dstv logo.jpg",
    href: "/services/tv",
    ctaText: "Pay DStv",
  },
  {
    id: "gotv",
    title: "GOtv",
    description: "Renew your GOtv subscription effortlessly and get back to your favorite shows.",
    logoSrc: "/logos/Gotv logo.png",
    href: "/services/tv",
    ctaText: "Pay GOtv",
  },
  {
    id: "zuku",
    title: "Zuku",
    description: "Settle your Zuku TV or Internet bills fast and securely.",
    logoSrc: "/logos/zuku logo.jpg",
    href: "/services/tv",
    ctaText: "Pay Zuku",
  },
  {
    id: "startimes",
    title: "StarTimes",
    description: "Keep your StarTimes decoder active. Instant payments available 24/7.",
    logoSrc: "/logos/startimes logo.jpg",
    href: "/services/tv",
    ctaText: "Pay StarTimes",
  },
];

const utilityServices = [
  {
    id: "kenya-power",
    title: "Kenya Power (KPLC)",
    description: "Buy KPLC prepaid tokens or pay your postpaid bill easily.",
    logoSrc: "/logos/kenya power logo.jpg",
    href: "/services/electricity",
    ctaText: "Pay Electricity",
  },
  {
    id: "nairobi-water",
    title: "Nairobi Water",
    description: "Pay your water bills promptly to avoid disconnection.",
    logoSrc: "/logos/water service logo.jpg",
    href: "/services/water",
    ctaText: "Pay Water",
  },
];

export default function ServicesDirectoryPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Header */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Services Directory
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore the wide range of digital services supported by QasiNet. 
            Pay securely and get instant vending without needing to register.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 space-y-24">
        
        {/* Mobile */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">Mobile</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mobileServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

        {/* TV */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">TV Subscriptions</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tvServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

        {/* Utilities */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">Utilities</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {utilityServices.map((service) => (
              <DetailedServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>

      </section>
    </div>
  );
}
